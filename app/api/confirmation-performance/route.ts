import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthKey } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  treated: z.number().int().nonnegative(),
  confirmed: z.number().int().nonnegative(),
  delivered: z.number().int().nonnegative(),
  monthKey: z.string().optional(),
  // Admins may write another agent's snapshot.
  userId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const monthKey = searchParams.get("month") || getCurrentMonthKey();
  const isAdmin = session.user.role === "ADMIN";
  const userId = (isAdmin && searchParams.get("userId")) || session.user.id;

  const entry = await prisma.confirmationEntry.findUnique({
    where: { userId_monthKey: { userId, monthKey } },
  });

  return NextResponse.json({
    treated: entry?.treated ?? 0,
    confirmed: entry?.confirmed ?? 0,
    delivered: entry?.delivered ?? 0,
    monthKey,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "CONFIRMATION_AGENT" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const monthKey = parsed.data.monthKey || getCurrentMonthKey();
  const isAdmin = role === "ADMIN";
  const userId = (isAdmin && parsed.data.userId) || session.user.id;

  const { treated, confirmed, delivered } = parsed.data;

  const entry = await prisma.confirmationEntry.upsert({
    where: { userId_monthKey: { userId, monthKey } },
    create: { userId, monthKey, treated, confirmed, delivered },
    update: { treated, confirmed, delivered },
  });

  await logAudit(
    session.user.id,
    session.user.name ?? "",
    "confirmation.update",
    `${monthKey} · treated ${treated} / confirmed ${confirmed} / delivered ${delivered}${
      isAdmin && parsed.data.userId ? ` (for ${userId})` : ""
    }`
  );

  return NextResponse.json(entry);
}
