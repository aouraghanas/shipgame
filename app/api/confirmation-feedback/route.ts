import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const TOPIC_VALUES = [
  "PRODUCT_QUALITY",
  "PRICING",
  "CLIENT_BEHAVIOR",
  "DELIVERY_ISSUE",
  "ORDER_DATA",
  "CANCELLATION_TREND",
  "OTHER",
] as const;

const SENTIMENT_VALUES = ["POSITIVE", "NEUTRAL", "NEGATIVE"] as const;

function canAccess(role?: string) {
  return role === "CONFIRMATION_AGENT" || role === "ADMIN";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccess(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");
  const topic = searchParams.get("topic");
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") || "50")));

  const where: Prisma.ConfirmationFeedbackWhereInput = {};
  if (session.user.role === "CONFIRMATION_AGENT") {
    where.agentId = session.user.id;
  } else if (agentId) {
    where.agentId = agentId;
  }
  if (topic && (TOPIC_VALUES as readonly string[]).includes(topic)) {
    where.topic = topic as (typeof TOPIC_VALUES)[number];
  }

  const [items, total] = await Promise.all([
    prisma.confirmationFeedback.findMany({
      where,
      include: { agent: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.confirmationFeedback.count({ where }),
  ]);

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccess(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const schema = z.object({
    orderRef: z.string().max(120).optional().nullable(),
    topic: z.enum(TOPIC_VALUES).default("OTHER"),
    sentiment: z.enum(SENTIMENT_VALUES).default("NEUTRAL"),
    title: z.string().max(200).optional().nullable(),
    details: z.string().min(1).max(2000),
    suggestedAction: z.string().max(2000).optional().nullable(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { orderRef, topic, sentiment, title, details, suggestedAction } = parsed.data;

  const rec = await prisma.confirmationFeedback.create({
    data: {
      agentId: session.user.id,
      orderRef: orderRef?.trim() || null,
      topic,
      sentiment,
      title: title?.trim() || null,
      details,
      suggestedAction: suggestedAction?.trim() || null,
    },
    include: { agent: { select: { id: true, name: true, avatarUrl: true } } },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "confirmation.feedback.create",
    `${topic} recommendation${orderRef ? ` (order ${orderRef})` : ""}: ${details.slice(0, 80)}${
      details.length > 80 ? "…" : ""
    }`
  );

  return NextResponse.json(rec, { status: 201 });
}
