import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// Admin only: delete a stock entry
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entry = await prisma.stockEntry.findUnique({ where: { id: params.id } });
  await prisma.stockEntry.delete({ where: { id: params.id } });

  await logAudit(
    session.user.id,
    session.user.name,
    "stock.delete",
    `Deleted stock entry (qty: ${entry?.quantity ?? "?"}, month: ${entry?.monthKey ?? "?"})`
  );

  return NextResponse.json({ success: true });
}
