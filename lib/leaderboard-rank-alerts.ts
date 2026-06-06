/**
 * Leaderboard rank-change alerts.
 *
 * We persist each user's last-seen rank per board+month in
 * `LeaderboardRankState`. On each leaderboard computation we compare the new
 * ranks against the stored ones and notify users whose rank moved (up or
 * down). State is then updated. The first time we ever see a user (no stored
 * row) we record the rank silently — no "you moved" alert on first run.
 *
 * Fire-and-forget: never throw into the leaderboard response path.
 */

import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/user-notifications";

type RankInput = { userId: string; rank: number };

const BOARD_LINK: Record<string, string> = {
  managers: "/leaderboard",
  confirmation: "/confirmation-leaderboard",
};

export async function reconcileLeaderboardRanks(
  board: "managers" | "confirmation",
  monthKey: string,
  current: RankInput[]
): Promise<void> {
  try {
    const userIds = current.map((c) => c.userId);
    if (userIds.length === 0) return;

    const prior = await prisma.leaderboardRankState.findMany({
      where: { board, monthKey, userId: { in: userIds } },
    });
    const priorMap = new Map(prior.map((p) => [p.userId, p.rank]));

    const link = BOARD_LINK[board] ?? "/leaderboard";

    for (const { userId, rank } of current) {
      const before = priorMap.get(userId);
      if (before != null && before !== rank) {
        const improved = rank < before; // lower number = better
        await notify({
          userId,
          kind: improved ? "LEADERBOARD_RANK_UP" : "LEADERBOARD_RANK_DOWN",
          title: improved
            ? `You moved up to #${rank}`
            : `You dropped to #${rank}`,
          body: improved
            ? `Nice! You climbed from #${before} to #${rank} on the leaderboard.`
            : `You went from #${before} to #${rank}. Push to climb back up!`,
          link,
        });
      }
    }

    // Upsert current ranks (sequential upserts keep it simple; volumes small).
    await Promise.all(
      current.map((c) =>
        prisma.leaderboardRankState.upsert({
          where: {
            userId_board_monthKey: { userId: c.userId, board, monthKey },
          },
          create: { userId: c.userId, board, monthKey, rank: c.rank },
          update: { rank: c.rank },
        })
      )
    );
  } catch (e) {
    console.error("[rank-alerts] failed", e instanceof Error ? e.message : e);
  }
}
