import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthKey } from "@/lib/utils";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  monthKey: z.string().optional(),
  rewardText: z.string().nullable().optional(),
  punishmentText: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const monthKey = searchParams.get("month") || getCurrentMonthKey();

  const config = await prisma.monthConfig.findUnique({ where: { monthKey } });
  return NextResponse.json({ monthKey, ...config });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const monthKey = parsed.data.monthKey || getCurrentMonthKey();

  const config = await prisma.monthConfig.upsert({
    where: { monthKey },
    create: {
      monthKey,
      rewardText: parsed.data.rewardText ?? null,
      punishmentText: parsed.data.punishmentText ?? null,
    },
    update: {
      rewardText: parsed.data.rewardText ?? null,
      punishmentText: parsed.data.punishmentText ?? null,
    },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "rewards.update",
    `Updated rewards config for ${monthKey}`
  );

  return NextResponse.json(config);
}
