import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import type { FeedbackReportPeriod } from "@prisma/client";

const PERIOD_VALUES = ["DAILY", "WEEKLY", "MONTHLY"] as const;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getRange(period: FeedbackReportPeriod, anchor: Date) {
  const now = new Date(anchor);
  if (period === "DAILY") return { from: startOfDay(now), to: endOfDay(now) };
  if (period === "WEEKLY") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const from = new Date(now);
    from.setDate(now.getDate() + mondayOffset);
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    return { from: startOfDay(from), to: endOfDay(to) };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: startOfDay(from), to: endOfDay(to) };
}

function topRepeated(notes: { details: string; seller: { name: string } }[]) {
  const keyCounts = new Map<string, number>();
  for (const n of notes) {
    const normalized = n.details.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const tokens = normalized.split(" ").filter((t) => t.length >= 4);
    const uniqueTokens = Array.from(new Set(tokens));
    for (const token of uniqueTokens) keyCounts.set(token, (keyCounts.get(token) ?? 0) + 1);
  }
  return Array.from(keyCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));
}

async function generateSummaryWithAI(input: {
  period: FeedbackReportPeriod;
  fromDate: Date;
  toDate: Date;
  notes: Array<{
    createdAt: Date;
    topic: string;
    sentiment: string;
    title: string | null;
    details: string;
    suggestedAction: string | null;
    seller: { name: string };
    manager: { name: string };
  }>;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      summary:
        "OPENAI_API_KEY is not configured. AI summary generation is disabled. You can still review manual notes in this report.",
      recommendations:
        "Set OPENAI_API_KEY in production and local environment, then generate the report again for AI insights.",
      model: null as string | null,
    };
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const lines = input.notes.slice(0, 500).map((n) => ({
    date: n.createdAt.toISOString(),
    topic: n.topic,
    sentiment: n.sentiment,
    seller: n.seller.name,
    manager: n.manager.name,
    title: n.title,
    details: n.details,
    suggestedAction: n.suggestedAction,
  }));

  const prompt = [
    "You are analyzing customer/seller feedback from account managers.",
    `Period: ${input.period} (${input.fromDate.toISOString()} to ${input.toDate.toISOString()})`,
    "Return strict JSON with keys:",
    "{ summary: string, recommendations: string, repeatedThemes: [{ theme: string, count: number }] }",
    "Requirements:",
    "- summary: concise executive summary, key concerns, key opportunities",
    "- recommendations: prioritized action plan",
    "- repeatedThemes: top repeated notes/themes with estimated frequency counts",
    "Feedback entries JSON:",
    JSON.stringify(lines),
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a strict JSON generator." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "unknown error");
    return {
      summary: `AI generation failed: ${response.status}.`,
      recommendations: `OpenAI API error details: ${err.slice(0, 500)}`,
      model,
    };
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content) as {
      summary?: string;
      recommendations?: string;
      repeatedThemes?: unknown;
    };
    const repeated = Array.isArray(parsed.repeatedThemes) ? parsed.repeatedThemes : [];
    return {
      summary: parsed.summary || "No summary generated.",
      recommendations: parsed.recommendations || "No recommendations generated.",
      model,
      repeatedThemes: repeated,
    };
  } catch {
    return {
      summary: "AI returned an invalid response format.",
      recommendations: content.slice(0, 2000),
      model,
      repeatedThemes: [],
    };
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const take = Math.min(Number(searchParams.get("take") || "100"), 300);

  const where: {
    period?: FeedbackReportPeriod;
    fromDate?: { gte?: Date };
    toDate?: { lte?: Date };
  } = {};

  if (period && PERIOD_VALUES.includes(period as (typeof PERIOD_VALUES)[number])) {
    where.period = period as FeedbackReportPeriod;
  }
  if (from) where.fromDate = { gte: new Date(from) };
  if (to) where.toDate = { lte: new Date(to + "T23:59:59.999Z") };

  const reports = await prisma.feedbackReport.findMany({
    where,
    include: { creator: { select: { id: true, name: true } } },
    orderBy: { generatedAt: "desc" },
    take,
  });

  return NextResponse.json(reports);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const schema = z.object({
    period: z.enum(PERIOD_VALUES),
    anchorDate: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const anchor = parsed.data.anchorDate ? new Date(parsed.data.anchorDate) : new Date();
  const { from, to } = getRange(parsed.data.period, anchor);

  const notes = await prisma.sellerFeedback.findMany({
    where: {
      createdAt: { gte: from, lte: to },
    },
    include: {
      seller: { select: { name: true } },
      manager: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const ai = await generateSummaryWithAI({
    period: parsed.data.period,
    fromDate: from,
    toDate: to,
    notes,
  });
  const repeatedFromText = topRepeated(notes.map((n) => ({ details: n.details, seller: n.seller })));
  const repeatedItems = Array.isArray((ai as { repeatedThemes?: unknown[] }).repeatedThemes)
    ? (ai as { repeatedThemes?: unknown[] }).repeatedThemes
    : repeatedFromText;

  const report = await prisma.feedbackReport.create({
    data: {
      period: parsed.data.period,
      fromDate: from,
      toDate: to,
      totalNotes: notes.length,
      repeatedItems: repeatedItems as object,
      summary: ai.summary,
      recommendations: ai.recommendations,
      model: ai.model,
      createdBy: session.user.id,
    },
    include: { creator: { select: { id: true, name: true } } },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "feedbackReport.generate",
    `Generated ${parsed.data.period.toLowerCase()} feedback report (${notes.length} notes)`
  );

  return NextResponse.json(report, { status: 201 });
}
