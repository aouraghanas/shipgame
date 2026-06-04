import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const CATEGORY_VALUES = [
  "CALL",
  "CONFIRMATION",
  "FOLLOW_UP",
  "NO_ANSWER",
  "RESCHEDULE",
  "CANCELLED",
  "OTHER",
] as const;

function canAccess(role?: string) {
  return role === "CONFIRMATION_AGENT" || role === "ADMIN";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccess(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const agentId = searchParams.get("agentId");
  const orderRef = searchParams.get("orderRef");
  const keyword = searchParams.get("keyword");
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") || "50")));

  const where: Prisma.ConfirmationActivityWhereInput = {};

  // Agents see only their own activities; admins can filter by agentId.
  if (session.user.role === "CONFIRMATION_AGENT") {
    where.agentId = session.user.id;
  } else if (agentId) {
    where.agentId = agentId;
  }

  if (orderRef) where.orderRef = { contains: orderRef, mode: "insensitive" };

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  if (keyword) where.description = { contains: keyword, mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.confirmationActivity.findMany({
      where,
      include: { agent: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.confirmationActivity.count({ where }),
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
    orderRef: z.string().min(1).max(120),
    description: z.string().min(1).max(2000),
    category: z.enum(CATEGORY_VALUES).default("CALL"),
    attachments: z.array(z.string().url()).max(10).default([]),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { orderRef, description, category, attachments } = parsed.data;

  const activity = await prisma.confirmationActivity.create({
    data: {
      agentId: session.user.id,
      orderRef,
      description,
      category,
      attachments,
    },
    include: { agent: { select: { id: true, name: true, avatarUrl: true } } },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "confirmation.activity.create",
    `Logged ${category.toLowerCase()} for order "${orderRef}": ${description.slice(0, 80)}${
      description.length > 80 ? "…" : ""
    }`
  );

  return NextResponse.json(activity, { status: 201 });
}
