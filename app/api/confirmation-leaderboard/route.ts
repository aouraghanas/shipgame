import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  confirmationScore,
  confirmationRate,
  confirmationScoringFromMonthConfigRow,
  rankConfirmationAgents,
  type RankedConfirmationAgent,
} from "@/lib/confirmation-scoring";
import { resolveRewardTexts, resolvePunishmentTexts } from "@/lib/month-rewards";
import { getCurrentMonthKey } from "@/lib/utils";
import { getSessionFromRequest } from "@/lib/mobile-auth";
import { reconcileLeaderboardRanks } from "@/lib/leaderboard-rank-alerts";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const monthKey = searchParams.get("month") || getCurrentMonthKey();

  const config = await prisma.monthConfig.findUnique({ where: { monthKey } });
  const scoringCfg = confirmationScoringFromMonthConfigRow(config);

  const users = await prisma.user.findMany({
    where: { role: "CONFIRMATION_AGENT", status: "ACTIVE" },
    include: {
      confirmationEntries: { where: { monthKey } },
      notes: { where: { monthKey, visible: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const agents: RankedConfirmationAgent[] = users.map((u) => {
    const entry = u.confirmationEntries[0];
    const treated = entry?.treated ?? 0;
    const confirmed = entry?.confirmed ?? 0;
    const delivered = entry?.delivered ?? 0;
    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      treated,
      confirmed,
      delivered,
      confirmationRateVal: confirmationRate(treated, confirmed),
      totalScoreVal: confirmationScore(treated, confirmed, delivered, scoringCfg),
      note: u.notes[0]?.content ?? null,
      createdAt: u.createdAt,
    };
  });

  const ranked = rankConfirmationAgents(agents);
  const entries = ranked.map((m, i) => ({ rank: i + 1, ...m }));

  if (monthKey === getCurrentMonthKey()) {
    void reconcileLeaderboardRanks(
      "confirmation",
      monthKey,
      entries.map((e) => ({ userId: e.userId, rank: e.rank }))
    );
  }

  // Confirmation rewards/punishments use their own conf* text fields, but fall
  // back to the shared resolver shape so the leaderboard UI can reuse the logic.
  const rewardTexts = resolveRewardTexts({
    rewardText1: config?.confRewardText1,
    rewardText2: config?.confRewardText2,
    rewardText3: config?.confRewardText3,
  });
  const punishmentTexts = resolvePunishmentTexts({
    punishmentText1: config?.confPunishmentText1,
    punishmentText2: config?.confPunishmentText2,
  });
  const winnerPlaces = Math.min(3, Math.max(1, config?.confWinnerPlaces ?? 3));
  const loserPlaces = Math.min(2, Math.max(1, config?.confLoserPlaces ?? 1));

  return NextResponse.json({
    monthKey,
    entries,
    rewardText: rewardTexts[0],
    punishmentText: punishmentTexts[0],
    winnerPlaces,
    loserPlaces,
    rewardTexts,
    punishmentTexts,
    leaderboardDesign: config?.leaderboardDesign ?? "CLASSIC",
    scoring: {
      treatedPoints: scoringCfg.treatedPoints,
      confirmedPoints: scoringCfg.confirmedPoints,
      deliveredPoints: scoringCfg.deliveredPoints,
    },
  });
}
