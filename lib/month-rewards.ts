/** Reward line for a podium rank (1–3) */
export function rewardTextForRank(
  rank: number,
  winnerPlaces: number,
  texts: [string | null, string | null, string | null]
): string | null {
  if (rank < 1 || rank > 3 || rank > winnerPlaces) return null;
  return texts[rank - 1] ?? null;
}

/** Punishment line for any rank (last / second-to-last) */
export function punishmentTextForRank(
  rank: number,
  totalManagers: number,
  loserPlaces: number,
  texts: [string | null, string | null]
): string | null {
  if (totalManagers < 2) return null;
  if (loserPlaces >= 1 && rank === totalManagers) return texts[0] ?? null;
  if (loserPlaces >= 2 && rank === totalManagers - 1) return texts[1] ?? null;
  return null;
}

/** Merge legacy single reward/punishment with per-place fields */
export function resolveRewardTexts(config: {
  rewardText?: string | null;
  rewardText1?: string | null;
  rewardText2?: string | null;
  rewardText3?: string | null;
  winnerPlaces?: number | null;
}): [string | null, string | null, string | null] {
  const legacy = config.rewardText?.trim() || null;
  const r1 = config.rewardText1?.trim() || legacy;
  const r2 = config.rewardText2?.trim() || null;
  const r3 = config.rewardText3?.trim() || null;
  return [r1, r2, r3];
}

export function resolvePunishmentTexts(config: {
  punishmentText?: string | null;
  punishmentText1?: string | null;
  punishmentText2?: string | null;
  loserPlaces?: number | null;
}): [string | null, string | null] {
  const legacy = config.punishmentText?.trim() || null;
  const p1 = config.punishmentText1?.trim() || legacy;
  const p2 = config.punishmentText2?.trim() || null;
  return [p1, p2];
}
