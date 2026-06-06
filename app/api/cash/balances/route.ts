import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canAccessAccounting,
  currencyScopeFor,
} from "@/lib/accounting-access";
import { applyOperationToBalances } from "@/lib/cash-operations";
import type { AccountingCurrency, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessAccounting(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Optional date range. When present, the wallet cards reflect only the net
  // movement of operations whose `occurredAt` falls inside the range — this
  // keeps the cards in sync with the (date-filtered) transactions list below.
  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const dateMatch = /^\d{4}-\d{2}-\d{2}$/;
  const where: Prisma.CashOperationWhereInput = {};
  if ((fromParam && dateMatch.test(fromParam)) || (toParam && dateMatch.test(toParam))) {
    where.occurredAt = {
      ...(fromParam && dateMatch.test(fromParam) ? { gte: new Date(`${fromParam}T00:00:00.000`) } : {}),
      ...(toParam && dateMatch.test(toParam) ? { lte: new Date(`${toParam}T23:59:59.999`) } : {}),
    };
  }

  const balances: Record<AccountingCurrency, number> = { MAD: 0, USD: 0, LYD: 0 };

  // Fold every op into the running balance. Volumes here are low — single
  // query is fine. We can switch to a materialized view if it ever grows.
  const ops = await prisma.cashOperation.findMany({
    where,
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
