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

const postSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.union([z.string(), z.number()]).transform((v) => String(v)),
  currency: z.nativeEnum(AccountingCurrency).optional(),
});

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessAccounting(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const scope = currencyScopeFor(session);
  const rows = await prisma.owedSeller.findMany({
    where: scope ? { currency: scope } : {},
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    rows.map((r) => ({ ...r, amount: r.amount.toString() }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessAccounting(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const scope = currencyScopeFor(session);
  const currency = parsed.data.currency ?? "USD";
  if (scope && currency !== scope) {
    return NextResponse.json(
      { error: `You can only manage sellers owed in ${scope}.` },
      { status: 403 }
    );
  }

  // Upsert by name so re-adding the same seller updates instead of erroring.
  const row = await prisma.owedSeller.upsert({
    where: { name: parsed.data.name.trim() },
    create: {
      name: parsed.data.name.trim(),
      amount: parsed.data.amount,
      currency,
    },
    update: {
      amount: parsed.data.amount,
      currency,
    },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "cash.owed.upsert",
    `Owed seller ${row.name} = ${row.amount} ${row.currency}`
  );

  return NextResponse.json({ ...row, amount: row.amount.toString() }, { status: 201 });
}
