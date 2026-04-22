export type StockEntryInput = {
  quantity: number;
};

/** Points for a single stock entry based on quantity */
export function stockEntryPoints(quantity: number): number {
  if (quantity >= 200) return 3;
  if (quantity >= 100) return 2;
  return 1;
}

/** Delivered score = total / 100 (decimal allowed) */
export function deliveredScore(total: number): number {
  return total / 100;
}

/** Sum of points for all stock entries */
export function totalStockScore(entries: StockEntryInput[]): number {
  return entries.reduce((sum, e) => sum + stockEntryPoints(e.quantity), 0);
}

/** Sum of all stock quantities */
export function totalStockQuantity(entries: StockEntryInput[]): number {
  return entries.reduce((sum, e) => sum + e.quantity, 0);
}

/** Combined score */
export function totalScore(
  deliveredTotal: number,
  stockEntries: StockEntryInput[]
): number {
  return deliveredScore(deliveredTotal) + totalStockScore(stockEntries);
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
    // 1. Total score descending
    if (b.totalScoreVal !== a.totalScoreVal)
      return b.totalScoreVal - a.totalScoreVal;
    // 2. Delivered orders descending
    if (b.deliveredTotal !== a.deliveredTotal)
      return b.deliveredTotal - a.deliveredTotal;
    // 3. Stock quantity descending
    if (b.stockQty !== a.stockQty) return b.stockQty - a.stockQty;
    // 4. Stable: earlier created user ranks higher (ascending)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
