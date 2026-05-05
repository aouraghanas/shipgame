import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAccountingAdmin } from "@/lib/accounting-access";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import {
  AccountingCategory,
  AccountingCurrency,
  AccountingDirection,
  Prisma,
} from "@prisma/client";

const patchSchema = z
  .object({
    direction: z.nativeEnum(AccountingDirection).optional(),
    category: z.nativeEnum(AccountingCategory).optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    currency: z.nativeEnum(AccountingCurrency).optional(),
    occurredAt: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    metadata: z.record(z.unknown()).optional(),
    amountUsdApprox: z.union([z.string(), z.number()]).nullable().optional(),
  })
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAccountingAdmin(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.accountingLedgerEntry.findUnique({
    where: { id: params.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Ledger line not found." }, { status: 404 });
  }

  const data: Prisma.AccountingLedgerEntryUpdateInput = {};
  if (parsed.data.direction !== undefined) data.direction = parsed.data.direction;
  if (parsed.data.category !== undefined) data.category = parsed.data.category;
  if (parsed.data.amount !== undefined) data.amount = parsed.data.amount;
  if (parsed.data.currency !== undefined) data.currency = parsed.data.currency;
  if (parsed.data.occurredAt !== undefined)
    data.occurredAt = new Date(parsed.data.occurredAt);
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.metadata !== undefined) {
    data.metadata = parsed.data.metadata as Prisma.InputJsonValue;
  }
  if (parsed.data.amountUsdApprox !== undefined) {
    data.amountUsdApprox = parsed.data.amountUsdApprox ?? null;
  }

  const row = await prisma.accountingLedgerEntry.update({
    where: { id: params.id },
    data,
    include: { createdBy: { select: { id: true, name: true } } },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "accounting.ledger.update",
    `Updated ledger ${row.id}: ${Object.keys(parsed.data).join(", ")}`
  );

  return NextResponse.json({
    ...row,
    amount: row.amount.toString(),
    amountUsdApprox: row.amountUsdApprox?.toString() ?? null,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAccountingAdmin(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const row = await prisma.accountingLedgerEntry.delete({ where: { id: params.id } });
  await logAudit(session.user.id, session.user.name, "accounting.ledger.delete", `Deleted ledger ${row.id}`);
  return NextResponse.json({ ok: true });
}
