import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canAccessAccounting,
  currencyScopeFor,
} from "@/lib/accounting-access";
import { logAudit } from "@/lib/audit";
import {
  buildOperationRow,
  cashOperationInputSchema,
} from "@/lib/cash-operations";
import {
  type AccountingCurrency,
  type CashOperationType,
  type Prisma,
} from "@prisma/client";

const ALL_TYPES = [
  "ADD_BALANCE",
  "FROM_DEX",
  "BUY_COD_PRODUCT",
  "BUY_SELLER_STOCK",
  "SELLER_PAY_STOCK",
  "CURRENCY_SWAP",
  "SALARY",
  "OFFICE_EXPENSE",
  "WITHDRAW",
  "OTHER",
] as const satisfies readonly CashOperationType[];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessAccounting(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const take = Math.min(Math.max(Number(sp.get("take") || "200"), 1), 500);
  const typeParam = sp.get("type");
  const scope = currencyScopeFor(session);

  const where: Prisma.CashOperationWhereInput = {};
  if (typeParam && (ALL_TYPES as readonly string[]).includes(typeParam)) {
    where.type = typeParam as CashOperationType;
  }
  if (scope) {
    // Libyan accountant: only show ops whose primary OR destination currency is LYD.
    where.OR = [{ currency: scope }, { destCurrency: scope }];
  }

  const rows = await prisma.cashOperation.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take,
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      amount: r.amount.toString(),
      destAmount: r.destAmount?.toString() ?? null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessAccounting(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!session.user?.id) {
    // Stale JWT (e.g. user signed in before id was added to the token).
    return NextResponse.json(
      { error: "Your session is missing a user id. Please sign out and sign back in." },
      { status: 401 }
    );
  }

  // Defensive: confirm the session user still exists in the DB. If an admin
  // account was renamed/recreated, the JWT can outlive its User row and
  // Prisma's foreign key on createdById will then fail with an opaque 500.
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true },
  });
  if (!me) {
    return NextResponse.json(
      { error: "Your user account was not found. Please sign out and sign back in." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = cashOperationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const row = buildOperationRow(parsed.data);

  // Libyan accountant: every currency involved must be LYD.
  const scope = currencyScopeFor(session);
  if (scope) {
    const touched: AccountingCurrency[] = [row.currency];
    if (row.destCurrency) touched.push(row.destCurrency);
    if (touched.some((c) => c !== scope)) {
      return NextResponse.json(
        { error: `You can only record operations in ${scope}.` },
        { status: 403 }
      );
    }
  }

  try {
    const created = await prisma.cashOperation.create({
      data: {
        type: row.type,
        direction: row.direction,
        occurredAt: row.occurredAt,
        amount: row.amount,
        currency: row.currency,
        destAmount: row.destAmount,
        destCurrency: row.destCurrency,
        description: row.description,
        note: row.note,
        metadata: row.metadata as Prisma.InputJsonValue,
        createdById: me.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    await logAudit(
      me.id,
      me.name,
      "cash.operation.create",
      `${row.type} ${row.amount} ${row.currency}`
    );

    return NextResponse.json(
      {
        ...created,
        amount: created.amount.toString(),
        destAmount: created.destAmount?.toString() ?? null,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[cash.operations.POST] create failed", {
      userId: me.id,
      userName: me.name,
      type: row.type,
      currency: row.currency,
      err: e instanceof Error ? { message: e.message, name: e.name } : String(e),
    });
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to save operation: ${message}` },
      { status: 500 }
    );
  }
}
