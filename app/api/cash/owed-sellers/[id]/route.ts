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

const patchSchema = z.object({
  amount: z.union([z.string(), z.number()]).transform((v) => String(v)).optional(),
  currency: z.nativeEnum(AccountingCurrency).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessAccounting(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.owedSeller.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const scope = currencyScopeFor(session);
  const nextCurrency = parsed.data.currency ?? existing.currency;
  if (scope && nextCurrency !== scope) {
    return NextResponse.json(
      { error: `You can only manage sellers owed in ${scope}.` },
      { status: 403 }
    );
  }

  const row = await prisma.owedSeller.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
      ...(parsed.data.currency !== undefined ? { currency: parsed.data.currency } : {}),
    },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "cash.owed.update",
    `Owed seller ${row.name} → ${row.amount} ${row.currency}`
  );

  return NextResponse.json({ ...row, amount: row.amount.toString() });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessAccounting(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.owedSeller.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const scope = currencyScopeFor(session);
  if (scope && existing.currency !== scope) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.owedSeller.delete({ where: { id: params.id } });
  await logAudit(
    session.user.id,
    session.user.name,
    "cash.owed.delete",
    `Removed owed seller ${existing.name}`
  );

  return NextResponse.json({ ok: true });
}
