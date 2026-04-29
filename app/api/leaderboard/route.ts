import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deliveredScore,
  totalStockScore,
  totalStockQuantity,
  rankManagers,
  scoringFromMonthConfigRow,
  type RankedManager,
} from "@/lib/scoring";
import { resolveRewardTexts, resolvePunishmentTexts } from "@/lib/month-rewards";
import { getCurrentMonthKey } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const monthKey = searchParams.get("month") || getCurrentMonthKey();

  const config = await prisma.monthConfig.findUnique({ where: { monthKey } });
  const scoringCfg = scoringFromMonthConfigRow(config);

  const users = await prisma.user.findMany({
    where: { role: "MANAGER", status: "ACTIVE" },
    include: {
      deliveredEntries: { where: { monthKey } },
      stockEntries: { where: { monthKey } },
      notes: { where: { monthKey, visible: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const managers: RankedManager[] = users.map((u) => {
    const deliveredTotal = u.deliveredEntries[0]?.total ?? 0;
    const stockEntries = u.stockEntries;
    const stockQty = totalStockQuantity(stockEntries);
    const stockScore = totalStockScore(stockEntries, scoringCfg);
    const dScore = deliveredScore(deliveredTotal, scoringCfg);
    const total = dScore + stockScore;

    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      deliveredTotal,
      stockQty,
      stockScore,
      deliveredScoreVal: dScore,
      totalScoreVal: total,
      note: u.notes[0]?.content ?? null,
      createdAt: u.createdAt,
    };
  });

  const ranked = rankManagers(managers);
  const entries = ranked.map((m, i) => ({ rank: i + 1, ...m }));

  const rewardTexts = resolveRewardTexts(config ?? {});
  const punishmentTexts = resolvePunishmentTexts(config ?? {});
  const winnerPlaces = Math.min(3, Math.max(1, config?.winnerPlaces ?? 3));
  const loserPlaces = Math.min(2, Math.max(1, config?.loserPlaces ?? 1));

  return NextResponse.json({
    monthKey,
    entries,
    rewardText: rewardTexts[0],
    punishmentText: punishmentTexts[0],
    winnerPlaces,
    loserPlaces,
    rewardTexts,
    punishmentTexts,
    scoring: {
      deliveredDivisor: scoringCfg.deliveredDivisor,
      stockBoundaryMid: scoringCfg.stockBoundaryMid,
      stockBoundaryHigh: scoringCfg.stockBoundaryHigh,
      stockPointsLow: scoringCfg.stockPointsLow,
      stockPointsMid: scoringCfg.stockPointsMid,
      stockPointsHigh: scoringCfg.stockPointsHigh,
    },
  });
}
