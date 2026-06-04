/**
 * Scoring helpers for call-center confirmation agents.
 *
 * Each agent enters a running cumulative snapshot (since the 1st of the month)
 * of orders treated / confirmed / delivered. Points are a simple weighted sum:
 *
 *   total = treated   * confTreatedPoints
 *         + confirmed * confConfirmedPoints
 *         + delivered * confDeliveredPoints
 *
 * Default weights (admin-configurable per month via MonthConfig):
 *   treated = 1, confirmed = 5, delivered = 20
 */

export type ConfirmationScoringConfig = {
  treatedPoints: number;
  confirmedPoints: number;
  deliveredPoints: number;
};

export const DEFAULT_CONFIRMATION_SCORING: ConfirmationScoringConfig = {
  treatedPoints: 1,
  confirmedPoints: 5,
  deliveredPoints: 20,
};

export function confirmationScoringFromMonthConfigRow(
  row: {
    confTreatedPoints: unknown;
    confConfirmedPoints: unknown;
    confDeliveredPoints: unknown;
  } | null
): ConfirmationScoringConfig {
  if (!row) return { ...DEFAULT_CONFIRMATION_SCORING };
  const pick = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    treatedPoints: pick(row.confTreatedPoints, DEFAULT_CONFIRMATION_SCORING.treatedPoints),
    confirmedPoints: pick(row.confConfirmedPoints, DEFAULT_CONFIRMATION_SCORING.confirmedPoints),
    deliveredPoints: pick(row.confDeliveredPoints, DEFAULT_CONFIRMATION_SCORING.deliveredPoints),
  };
}

export function confirmationScore(
  treated: number,
  confirmed: number,
  delivered: number,
  cfg: ConfirmationScoringConfig = DEFAULT_CONFIRMATION_SCORING
): number {
  return (
    treated * cfg.treatedPoints +
    confirmed * cfg.confirmedPoints +
    delivered * cfg.deliveredPoints
  );
}

/** Confirmation rate = confirmed / treated (0 when no treated orders). */
export function confirmationRate(treated: number, confirmed: number): number {
  if (treated <= 0) return 0;
  return confirmed / treated;
}

export type RankedConfirmationAgent = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  treated: number;
  confirmed: number;
  delivered: number;
  confirmationRateVal: number;
  totalScoreVal: number;
  note: string | null;
  createdAt: Date;
};

/** Sort confirmation agents by rank rules (does not mutate input). */
export function rankConfirmationAgents(
  agents: RankedConfirmationAgent[]
): RankedConfirmationAgent[] {
  return [...agents].sort((a, b) => {
    if (b.totalScoreVal !== a.totalScoreVal) return b.totalScoreVal - a.totalScoreVal;
    if (b.delivered !== a.delivered) return b.delivered - a.delivered;
    if (b.confirmed !== a.confirmed) return b.confirmed - a.confirmed;
    if (b.treated !== a.treated) return b.treated - a.treated;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
