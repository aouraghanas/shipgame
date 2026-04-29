import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthKey } from "@/lib/utils";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { Decimal } from "@prisma/client/runtime/library";

const schema = z
  .object({
    monthKey: z.string().optional(),
    rewardText: z.string().nullable().optional(),
    punishmentText: z.string().nullable().optional(),
    winnerPlaces: z.coerce.number().int().min(1).max(3).optional(),
    loserPlaces: z.coerce.number().int().min(1).max(2).optional(),
    rewardText1: z.string().nullable().optional(),
    rewardText2: z.string().nullable().optional(),
    rewardText3: z.string().nullable().optional(),
    punishmentText1: z.string().nullable().optional(),
    punishmentText2: z.string().nullable().optional(),
    deliveredDivisor: z.coerce.number().positive().optional(),
    stockBoundaryMid: z.coerce.number().int().min(1).optional(),
    stockBoundaryHigh: z.coerce.number().int().min(1).optional(),
    stockPointsLow: z.coerce.number().int().min(0).optional(),
    stockPointsMid: z.coerce.number().int().min(0).optional(),
    stockPointsHigh: z.coerce.number().int().min(0).optional(),
    leaderboardDesign: z.enum(["CLASSIC", "ARENA"]).optional(),
  })
  .refine(
    (d) =>
      d.stockBoundaryMid == null ||
      d.stockBoundaryHigh == null ||
      d.stockBoundaryMid < d.stockBoundaryHigh,
    { message: "Stock tier mid boundary must be less than high boundary", path: ["stockBoundaryHigh"] }
  );

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
  const d = parsed.data;

  const config = await prisma.monthConfig.upsert({
    where: { monthKey },
    create: {
      monthKey,
      rewardText: d.rewardText ?? null,
      punishmentText: d.punishmentText ?? null,
      winnerPlaces: d.winnerPlaces ?? 3,
      loserPlaces: d.loserPlaces ?? 1,
      rewardText1: d.rewardText1 ?? null,
      rewardText2: d.rewardText2 ?? null,
      rewardText3: d.rewardText3 ?? null,
      punishmentText1: d.punishmentText1 ?? null,
      punishmentText2: d.punishmentText2 ?? null,
      deliveredDivisor: d.deliveredDivisor != null ? new Decimal(d.deliveredDivisor) : new Decimal(100),
      stockBoundaryMid: d.stockBoundaryMid ?? 100,
      stockBoundaryHigh: d.stockBoundaryHigh ?? 200,
      stockPointsLow: d.stockPointsLow ?? 1,
      stockPointsMid: d.stockPointsMid ?? 2,
      stockPointsHigh: d.stockPointsHigh ?? 3,
      leaderboardDesign: d.leaderboardDesign ?? "CLASSIC",
    },
    update: {
      ...(d.rewardText !== undefined && { rewardText: d.rewardText }),
      ...(d.punishmentText !== undefined && { punishmentText: d.punishmentText }),
      ...(d.winnerPlaces !== undefined && { winnerPlaces: d.winnerPlaces }),
      ...(d.loserPlaces !== undefined && { loserPlaces: d.loserPlaces }),
      ...(d.rewardText1 !== undefined && { rewardText1: d.rewardText1 }),
      ...(d.rewardText2 !== undefined && { rewardText2: d.rewardText2 }),
      ...(d.rewardText3 !== undefined && { rewardText3: d.rewardText3 }),
      ...(d.punishmentText1 !== undefined && { punishmentText1: d.punishmentText1 }),
      ...(d.punishmentText2 !== undefined && { punishmentText2: d.punishmentText2 }),
      ...(d.deliveredDivisor !== undefined && { deliveredDivisor: new Decimal(d.deliveredDivisor) }),
      ...(d.stockBoundaryMid !== undefined && { stockBoundaryMid: d.stockBoundaryMid }),
      ...(d.stockBoundaryHigh !== undefined && { stockBoundaryHigh: d.stockBoundaryHigh }),
      ...(d.stockPointsLow !== undefined && { stockPointsLow: d.stockPointsLow }),
      ...(d.stockPointsMid !== undefined && { stockPointsMid: d.stockPointsMid }),
      ...(d.stockPointsHigh !== undefined && { stockPointsHigh: d.stockPointsHigh }),
      ...(d.leaderboardDesign !== undefined && { leaderboardDesign: d.leaderboardDesign }),
    },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "rewards.update",
    `Updated rewards & scoring for ${monthKey}`
  );

  return NextResponse.json(config);
}
