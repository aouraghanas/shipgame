import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const TOPIC_VALUES = [
  "FEATURE_REQUEST",
  "BUG_REPORT",
  "UX_IMPROVEMENT",
  "PRICING",
  "INTEGRATION",
  "SUPPORT",
  "OTHER",
] as const;

const SENTIMENT_VALUES = ["POSITIVE", "NEUTRAL", "NEGATIVE"] as const;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "SCREEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const managerId = searchParams.get("managerId");
  const sellerId = searchParams.get("sellerId");
  const topic = searchParams.get("topic");
  const keyword = searchParams.get("keyword");
  const limit = Math.min(Number(searchParams.get("limit") || "500"), 2000);

  const where: Prisma.SellerFeedbackWhereInput = {};

  if (session.user.role === "MANAGER") {
    where.managerId = session.user.id;
  } else if (managerId) {
    where.managerId = managerId;
  }

  if (sellerId) where.sellerId = sellerId;
  if (topic && TOPIC_VALUES.includes(topic as (typeof TOPIC_VALUES)[number])) where.topic = topic as (typeof TOPIC_VALUES)[number];

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  if (keyword) {
    where.OR = [
      { details: { contains: keyword, mode: "insensitive" } },
      { title: { contains: keyword, mode: "insensitive" } },
      { suggestedAction: { contains: keyword, mode: "insensitive" } },
      { seller: { name: { contains: keyword, mode: "insensitive" } } },
    ];
  }

  const notes = await prisma.sellerFeedback.findMany({
    where,
    include: {
      manager: { select: { id: true, name: true, avatarUrl: true } },
      seller: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "SCREEN" || session.user.role === "SOURCING_AGENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const schema = z.object({
    sellerId: z.string().min(1),
    topic: z.enum(TOPIC_VALUES).default("OTHER"),
    sentiment: z.enum(SENTIMENT_VALUES).default("NEUTRAL"),
    title: z.string().max(200).optional().nullable(),
    details: z.string().min(5).max(5000),
    suggestedAction: z.string().max(2000).optional().nullable(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const seller = await prisma.seller.findUnique({ where: { id: parsed.data.sellerId } });
  if (!seller) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

  const note = await prisma.sellerFeedback.create({
    data: {
      managerId: session.user.id,
      sellerId: parsed.data.sellerId,
      topic: parsed.data.topic,
      sentiment: parsed.data.sentiment,
      title: parsed.data.title?.trim() || null,
      details: parsed.data.details.trim(),
      suggestedAction: parsed.data.suggestedAction?.trim() || null,
    },
    include: {
      manager: { select: { id: true, name: true, avatarUrl: true } },
      seller: { select: { id: true, name: true, email: true } },
    },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "sellerFeedback.create",
    `Logged seller feedback for "${seller.name}" (${parsed.data.topic})`
  );

  return NextResponse.json(note, { status: 201 });
}
