import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canAccessAccounting,
  currencyScopeFor,
} from "@/lib/accounting-access";
import { applyOperationToBalances } from "@/lib/cash-operations";
import type { AccountingCurrency } from "@prisma/client";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessAccounting(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const balances: Record<AccountingCurrency, number> = { MAD: 0, USD: 0, LYD: 0 };

  // Fold every op into the running balance. Volumes here are low — single
  // query is fine. We can switch to a materialized view if it ever grows.
  const ops = await prisma.cashOperation.findMany({
    select: {
      direction: true,
      currency: true,
      amount: true,
      destCurrency: true,
      destAmount: true,
    },
  });
  for (const op of ops) applyOperationToBalances(op, balances);

  const owed = await prisma.owedSeller.findMany({
    select: { amount: true, currency: true },
  });
  const owedTotals: Record<AccountingCurrency, number> = { MAD: 0, USD: 0, LYD: 0 };
  for (const s of owed) owedTotals[s.currency] += Number(s.amount.toString());

  const scope = currencyScopeFor(session);
  if (scope) {
    // Libyan accountant: blank out the other currencies.
    for (const c of ["MAD", "USD", "LYD"] as AccountingCurrency[]) {
      if (c !== scope) {
        balances[c] = 0;
        owedTotals[c] = 0;
      }
    }
  }

  return NextResponse.json({
    balances: {
      MAD: balances.MAD.toFixed(4),
      USD: balances.USD.toFixed(4),
      LYD: balances.LYD.toFixed(4),
    },
    owedTotals: {
      MAD: owedTotals.MAD.toFixed(4),
      USD: owedTotals.USD.toFixed(4),
      LYD: owedTotals.LYD.toFixed(4),
    },
  });
}
