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
    // Confirmation-agent (call-center) config
    confTreatedPoints: z.coerce.number().min(0).optional(),
    confConfirmedPoints: z.coerce.number().min(0).optional(),
    confDeliveredPoints: z.coerce.number().min(0).optional(),
    confWinnerPlaces: z.coerce.number().int().min(1).max(3).optional(),
    confLoserPlaces: z.coerce.number().int().min(1).max(2).optional(),
    confRewardText1: z.string().nullable().optional(),
    confRewardText2: z.string().nullable().optional(),
    confRewardText3: z.string().nullable().optional(),
    confPunishmentText1: z.string().nullable().optional(),
    confPunishmentText2: z.string().nullable().optional(),
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
      confTreatedPoints: d.confTreatedPoints != null ? new Decimal(d.confTreatedPoints) : new Decimal(1),
      confConfirmedPoints: d.confConfirmedPoints != null ? new Decimal(d.confConfirmedPoints) : new Decimal(5),
      confDeliveredPoints: d.confDeliveredPoints != null ? new Decimal(d.confDeliveredPoints) : new Decimal(20),
      confWinnerPlaces: d.confWinnerPlaces ?? 3,
      confLoserPlaces: d.confLoserPlaces ?? 1,
      confRewardText1: d.confRewardText1 ?? null,
      confRewardText2: d.confRewardText2 ?? null,
      confRewardText3: d.confRewardText3 ?? null,
      confPunishmentText1: d.confPunishmentText1 ?? null,
      confPunishmentText2: d.confPunishmentText2 ?? null,
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
      ...(d.confTreatedPoints !== undefined && { confTreatedPoints: new Decimal(d.confTreatedPoints) }),
      ...(d.confConfirmedPoints !== undefined && { confConfirmedPoints: new Decimal(d.confConfirmedPoints) }),
      ...(d.confDeliveredPoints !== undefined && { confDeliveredPoints: new Decimal(d.confDeliveredPoints) }),
      ...(d.confWinnerPlaces !== undefined && { confWinnerPlaces: d.confWinnerPlaces }),
      ...(d.confLoserPlaces !== undefined && { confLoserPlaces: d.confLoserPlaces }),
      ...(d.confRewardText1 !== undefined && { confRewardText1: d.confRewardText1 }),
      ...(d.confRewardText2 !== undefined && { confRewardText2: d.confRewardText2 }),
      ...(d.confRewardText3 !== undefined && { confRewardText3: d.confRewardText3 }),
      ...(d.confPunishmentText1 !== undefined && { confPunishmentText1: d.confPunishmentText1 }),
      ...(d.confPunishmentText2 !== undefined && { confPunishmentText2: d.confPunishmentText2 }),
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
