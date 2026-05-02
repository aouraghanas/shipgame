import type { AccountingCurrency, AccountingDirection } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SummaryRow = {
  category: string;
  direction: AccountingDirection;
  currency: AccountingCurrency;
  total: string;
};

export async function buildAccountingSummary(
  from: Date,
  to: Date,
  options?: { currency?: AccountingCurrency }
): Promise<{
  rows: SummaryRow[];
  byCurrency: Record<AccountingCurrency, { revenue: string; expense: string; net: string }>;
}> {
  const entries = await prisma.accountingLedgerEntry.findMany({
    where: {
      occurredAt: { gte: from, lte: to },
      ...(options?.currency ? { currency: options.currency } : {}),
    },
    select: { category: true, direction: true, currency: true, amount: true },
  });

  const key = (c: string, d: string, cur: string) => `${c}|${d}|${cur}`;
  const map = new Map<string, Prisma.Decimal>();

  for (const e of entries) {
    const k = key(e.category, e.direction, e.currency);
    map.set(k, (map.get(k) ?? new Prisma.Decimal(0)).plus(e.amount));
  }

  const rows: SummaryRow[] = Array.from(map.entries()).map(([k, total]) => {
    const [category, direction, currency] = k.split("|") as [string, AccountingDirection, AccountingCurrency];
    return { category, direction, currency, total: total.toFixed(4) };
  });
  rows.sort((a, b) => a.category.localeCompare(b.category));

  const byCurrency: Record<
    AccountingCurrency,
    { revenue: Prisma.Decimal; expense: Prisma.Decimal }
  > = {
    LYD: { revenue: new Prisma.Decimal(0), expense: new Prisma.Decimal(0) },
    USD: { revenue: new Prisma.Decimal(0), expense: new Prisma.Decimal(0) },
    MAD: { revenue: new Prisma.Decimal(0), expense: new Prisma.Decimal(0) },
  };

  for (const e of entries) {
    if (e.direction === "REVENUE") byCurrency[e.currency].revenue = byCurrency[e.currency].revenue.plus(e.amount);
    else byCurrency[e.currency].expense = byCurrency[e.currency].expense.plus(e.amount);
  }

  const byCurrencyStr = {} as Record<AccountingCurrency, { revenue: string; expense: string; net: string }>;
  for (const cur of ["LYD", "USD", "MAD"] as AccountingCurrency[]) {
    const { revenue, expense } = byCurrency[cur];
    byCurrencyStr[cur] = {
      revenue: revenue.toFixed(4),
      expense: expense.toFixed(4),
      net: revenue.minus(expense).toFixed(4),
    };
  }

  return { rows, byCurrency: byCurrencyStr };
}
