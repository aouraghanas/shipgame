import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canAccessAccounting,
  currencyScopeFor,
} from "@/lib/accounting-access";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { AccountingCurrency } from "@prisma/client";

// Reserved seller "name" used to persist the single owed-to-sellers total.
// Using a fixed sentinel keeps the schema's @unique(name) constraint usable
// while also giving us a deterministic key to upsert against.
const TOTAL_NAME = "Owed total";

/**
 * GET /api/cash/owed-total
 *
 * Returns the single owed-to-sellers value to display in the wallet card.
 *
 * The UI used to track multiple rows (one per seller). We collapsed that into
 * a single number, but legacy rows may still exist. To keep the displayed
 * total stable across the migration we sum every row visible to the caller
 * (filtered by Libyan-accountant scope) and report it back as one figure.
 *
 * Currency is the most-recently-updated row's currency (best-effort).
 */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessAccounting(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const scope = currencyScopeFor(session);
  const rows = await prisma.owedSeller.findMany({
    where: scope ? { currency: scope } : {},
    orderBy: { updatedAt: "desc" },
  });

  if (rows.length === 0) {
    return NextResponse.json({
      amount: "0",
      currency: (scope ?? "USD") as AccountingCurrency,
    });
  }

  const total = rows.reduce(
    (acc, r) => acc + Number(r.amount.toString()),
    0
  );
  return NextResponse.json({
    amount: String(total),
    currency: rows[0].currency,
  });
}

const putSchema = z.object({
  amount: z.union([z.string(), z.number()]).transform((v) => String(v)),
  currency: z.nativeEnum(AccountingCurrency),
});

/**
 * PUT /api/cash/owed-total
 *
 * Replaces the entire owed-sellers table with a single sentinel row that
 * carries the current outstanding total. Old per-seller rows are wiped in
 * the same transaction so the table never accumulates stale entries.
 *
 * Libyan-accountant scope: locked to LYD. Any other currency is rejected.
 */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessAccounting(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!session.user?.id) {
    return NextResponse.json(
      { error: "Your session is missing a user id. Please sign out and sign back in." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const scope = currencyScopeFor(session);
  if (scope && parsed.data.currency !== scope) {
    return NextResponse.json(
      { error: `You can only set the total in ${scope}.` },
      { status: 403 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Wipe every row that the caller can act on (admins wipe all, the
      // Libyan accountant only wipes LYD), then upsert the sentinel.
      await tx.owedSeller.deleteMany({
        where: scope
          ? { currency: scope, name: { not: TOTAL_NAME } }
          : { name: { not: TOTAL_NAME } },
      });
      await tx.owedSeller.upsert({
        where: { name: TOTAL_NAME },
        create: {
          name: TOTAL_NAME,
          amount: parsed.data.amount,
          currency: parsed.data.currency,
        },
        update: {
          amount: parsed.data.amount,
          currency: parsed.data.currency,
        },
      });
    });

    await logAudit(
      session.user.id,
      session.user.name ?? "",
      "cash.owed.setTotal",
      `Owed to sellers total = ${parsed.data.amount} ${parsed.data.currency}`
    );

    return NextResponse.json({
      amount: parsed.data.amount,
      currency: parsed.data.currency,
    });
  } catch (e) {
    console.error("[cash.owed-total.PUT] failed", {
      userId: session.user.id,
      err: e instanceof Error ? { message: e.message, name: e.name } : String(e),
    });
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to save total: ${message}` },
      { status: 500 }
    );
  }
}
