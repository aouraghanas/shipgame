import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthKey } from "@/lib/utils";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  quantity: z.number().int().positive(),
  sellerName: z.string().optional(),
  monthKey: z.string().optional(),
  userId: z.string().optional(), // admin can specify userId
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const monthKey = searchParams.get("month") || getCurrentMonthKey();
  const targetUserId = searchParams.get("userId") || session.user.id;

  // Non-admins can only see their own
  if (session.user.role !== "ADMIN" && targetUserId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entries = await prisma.stockEntry.findMany({
    where: { userId: targetUserId, monthKey },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const monthKey = parsed.data.monthKey || getCurrentMonthKey();
  // Admin can post for any user; manager can only post for themselves
  const userId =
    session.user.role === "ADMIN" && parsed.data.userId
      ? parsed.data.userId
      : session.user.id;

  const entry = await prisma.stockEntry.create({
    data: {
      userId,
      monthKey,
      quantity: parsed.data.quantity,
      sellerName: parsed.data.sellerName ?? null,
    },
  });

  const seller = parsed.data.sellerName ? ` (seller: ${parsed.data.sellerName})` : "";
  await logAudit(
    session.user.id,
    session.user.name,
    "stock.create",
    `Added ${parsed.data.quantity} stock order${seller} for month ${monthKey}`
  );

  return NextResponse.json(entry, { status: 201 });
}
