import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthKey } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  total: z.number().int().nonnegative(),
  monthKey: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const monthKey = searchParams.get("month") || getCurrentMonthKey();
  const userId = session.user.id;

  const entry = await prisma.deliveredEntry.findUnique({
    where: { userId_monthKey: { userId, monthKey } },
  });

  return NextResponse.json({ total: entry?.total ?? 0, monthKey });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const monthKey = parsed.data.monthKey || getCurrentMonthKey();
  const userId = session.user.id;

  const entry = await prisma.deliveredEntry.upsert({
    where: { userId_monthKey: { userId, monthKey } },
    create: { userId, monthKey, total: parsed.data.total },
    update: { total: parsed.data.total },
  });

  return NextResponse.json(entry);
}
