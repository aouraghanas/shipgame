export type StockEntryInput = {
  quantity: number;
};

/** Monthly scoring knobs (from MonthConfig or defaults). */
export type ScoringConfig = {
  deliveredDivisor: number;
  stockBoundaryMid: number;
  stockBoundaryHigh: number;
  stockPointsLow: number;
  stockPointsMid: number;
  stockPointsHigh: number;
};

export const DEFAULT_SCORING: ScoringConfig = {
  deliveredDivisor: 100,
  stockBoundaryMid: 100,
  stockBoundaryHigh: 200,
  stockPointsLow: 1,
  stockPointsMid: 2,
  stockPointsHigh: 3,
};

export function scoringFromMonthConfigRow(row: {
  deliveredDivisor: unknown;
  stockBoundaryMid: number;
  stockBoundaryHigh: number;
  stockPointsLow: number;
  stockPointsMid: number;
  stockPointsHigh: number;
} | null): ScoringConfig {
  if (!row) return { ...DEFAULT_SCORING };
  const div = Number(row.deliveredDivisor);
  return {
    deliveredDivisor: Number.isFinite(div) && div > 0 ? div : DEFAULT_SCORING.deliveredDivisor,
    stockBoundaryMid: row.stockBoundaryMid ?? DEFAULT_SCORING.stockBoundaryMid,
    stockBoundaryHigh: row.stockBoundaryHigh ?? DEFAULT_SCORING.stockBoundaryHigh,
    stockPointsLow: row.stockPointsLow ?? DEFAULT_SCORING.stockPointsLow,
    stockPointsMid: row.stockPointsMid ?? DEFAULT_SCORING.stockPointsMid,
    stockPointsHigh: row.stockPointsHigh ?? DEFAULT_SCORING.stockPointsHigh,
  };
}

/** Points for a single stock entry based on quantity and monthly rules */
export function stockEntryPoints(quantity: number, cfg: ScoringConfig = DEFAULT_SCORING): number {
  if (quantity < 1) return 0;
  if (quantity >= cfg.stockBoundaryHigh) return cfg.stockPointsHigh;
  if (quantity >= cfg.stockBoundaryMid) return cfg.stockPointsMid;
  return cfg.stockPointsLow;
}

/** Delivered score = total / deliveredDivisor */
export function deliveredScore(total: number, cfg: ScoringConfig = DEFAULT_SCORING): number {
  const d = cfg.deliveredDivisor > 0 ? cfg.deliveredDivisor : DEFAULT_SCORING.deliveredDivisor;
  return total / d;
}

/** Sum of points for all stock entries */
export function totalStockScore(
  entries: StockEntryInput[],
  cfg: ScoringConfig = DEFAULT_SCORING
): number {
  return entries.reduce((sum, e) => sum + stockEntryPoints(e.quantity, cfg), 0);
}

/** Sum of all stock quantities */
export function totalStockQuantity(entries: StockEntryInput[]): number {
  return entries.reduce((sum, e) => sum + e.quantity, 0);
}

/** Combined score */
export function totalScore(
  deliveredTotal: number,
  stockEntries: StockEntryInput[],
  cfg: ScoringConfig = DEFAULT_SCORING
): number {
  return deliveredScore(deliveredTotal, cfg) + totalStockScore(stockEntries, cfg);
}

export type RankedManager = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  deliveredTotal: number;
  stockQty: number;
  stockScore: number;
  deliveredScoreVal: number;
  totalScoreVal: number;
  note: string | null;
  createdAt: Date;
};

/** Sort managers by rank rules (mutates array) */
export function rankManagers(managers: RankedManager[]): RankedManager[] {
  return [...managers].sort((a, b) => {
    if (b.totalScoreVal !== a.totalScoreVal) return b.totalScoreVal - a.totalScoreVal;
    if (b.deliveredTotal !== a.deliveredTotal) return b.deliveredTotal - a.deliveredTotal;
    if (b.stockQty !== a.stockQty) return b.stockQty - a.stockQty;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
