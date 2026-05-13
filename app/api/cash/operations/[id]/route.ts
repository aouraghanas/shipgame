import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAccountingAdmin } from "@/lib/accounting-access";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAccountingAdmin(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const row = await prisma.cashOperation.delete({ where: { id: params.id } });
  await logAudit(
    session.user.id,
    session.user.name,
    "cash.operation.delete",
    `Deleted cash op ${row.id} (${row.type})`
  );
  return NextResponse.json({ ok: true });
}
