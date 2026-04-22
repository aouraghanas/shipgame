import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const CATEGORY_VALUES = ["CALL", "EMAIL", "MEETING", "ISSUE_FIX", "FOLLOW_UP", "OTHER"] as const;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "SCREEN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const managerId = searchParams.get("managerId");
  const sellerId = searchParams.get("sellerId");
  const keyword = searchParams.get("keyword");

  const where: Prisma.ManagerActivityWhereInput = {};

  // Managers see only their own activities
  if (session.user.role === "MANAGER") {
    where.managerId = session.user.id;
  } else if (managerId) {
    where.managerId = managerId;
  }

  if (sellerId) where.sellerId = sellerId;

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }

  if (keyword) {
    where.description = { contains: keyword, mode: "insensitive" };
  }

  const activities = await prisma.managerActivity.findMany({
    where,
    include: {
      manager: { select: { id: true, name: true, avatarUrl: true } },
      seller: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json(activities);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "SCREEN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const schema = z.object({
    sellerId: z.string().min(1),
    description: z.string().min(1).max(2000),
    category: z.enum(CATEGORY_VALUES).default("OTHER"),
    attachments: z.array(z.string().url()).max(10).default([]),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sellerId, description, category, attachments } = parsed.data;

  const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
  if (!seller)
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });

  const activity = await prisma.managerActivity.create({
    data: {
      managerId: session.user.id,
      sellerId,
      description,
      category,
      attachments,
    },
    include: {
      manager: { select: { id: true, name: true, avatarUrl: true } },
      seller: { select: { id: true, name: true, email: true } },
    },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "activity.create",
    `Logged ${category.toLowerCase()} with seller "${seller.name}": ${description.slice(0, 80)}${description.length > 80 ? "…" : ""}`
  );

  return NextResponse.json(activity, { status: 201 });
}
