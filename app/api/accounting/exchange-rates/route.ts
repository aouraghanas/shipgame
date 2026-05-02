import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canUseAccountingTools, isAccountingAdmin } from "@/lib/accounting-access";
import { logAudit } from "@/lib/audit";

const postSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lydPerUsd: z.union([z.string(), z.number()]),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canUseAccountingTools(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const take = Math.min(Number(req.nextUrl.searchParams.get("take") || "60"), 200);
  const rows = await prisma.accountingExchangeRate.findMany({
    orderBy: { dateKey: "desc" },
    take,
  });
  return NextResponse.json(rows.map((r) => ({ ...r, lydPerUsd: r.lydPerUsd.toString() })));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAccountingAdmin(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.accountingExchangeRate.upsert({
    where: { dateKey: parsed.data.dateKey },
    create: {
      dateKey: parsed.data.dateKey,
      lydPerUsd: parsed.data.lydPerUsd,
      notes: parsed.data.notes,
    },
    update: {
      lydPerUsd: parsed.data.lydPerUsd,
      notes: parsed.data.notes,
    },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "accounting.fx.upsert",
    `Exchange rate ${parsed.data.dateKey}: ${row.lydPerUsd.toString()} LYD/USD`
  );

  return NextResponse.json({ ...row, lydPerUsd: row.lydPerUsd.toString() });
}
