import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AccountingCategory, AccountingCurrency, AccountingDirection } from "@prisma/client";
import { canAccessAccounting, currencyScopeFor } from "@/lib/accounting-access";
import { logAudit } from "@/lib/audit";

const postSchema = z.object({
  direction: z.nativeEnum(AccountingDirection),
  category: z.nativeEnum(AccountingCategory),
  amount: z.union([z.string(), z.number()]),
  currency: z.nativeEnum(AccountingCurrency),
  occurredAt: z.string().min(1),
  description: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  amountUsdApprox: z.union([z.string(), z.number()]).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessAccounting(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const take = Math.min(Number(sp.get("take") || "200"), 500);

  const where: { occurredAt?: { gte?: Date; lte?: Date }; currency?: AccountingCurrency } = {};
  if (from || to) {
    where.occurredAt = {};
    if (from) where.occurredAt.gte = new Date(from);
    if (to) where.occurredAt.lte = new Date(to + "T23:59:59.999Z");
  }

  const scope = currencyScopeFor(session);
  if (scope) where.currency = scope;

  const rows = await prisma.accountingLedgerEntry.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take,
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      amount: r.amount.toString(),
      amountUsdApprox: r.amountUsdApprox?.toString() ?? null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessAccounting(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const scope = currencyScopeFor(session);
  if (scope && parsed.data.currency !== scope) {
    return NextResponse.json(
      { error: `You can only record entries in ${scope}.` },
      { status: 403 }
    );
  }

  const row = await prisma.accountingLedgerEntry.create({
    data: {
      direction: parsed.data.direction,
      category: parsed.data.category,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      occurredAt: new Date(parsed.data.occurredAt),
      description: parsed.data.description,
      metadata: parsed.data.metadata ?? undefined,
      amountUsdApprox: parsed.data.amountUsdApprox ?? undefined,
      createdById: session.user.id,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "accounting.ledger.create",
    `${parsed.data.direction} ${parsed.data.category} ${parsed.data.amount} ${parsed.data.currency}`
  );

  return NextResponse.json(
    {
      ...row,
      amount: row.amount.toString(),
      amountUsdApprox: row.amountUsdApprox?.toString() ?? null,
    },
    { status: 201 }
  );
}
