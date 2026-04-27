import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { isAccountingAdmin } from "@/lib/accounting-access";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  dexpressCostLyd: z.union([z.string(), z.number()]).optional(),
  sellToSellerLyd: z.union([z.string(), z.number()]).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAccountingAdmin(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.accountingCityRate.update({
    where: { id: params.id },
    data: parsed.data,
  });

  await logAudit(session.user.id, session.user.name, "accounting.city.patch", `Updated city rate ${row.name}`);

  return NextResponse.json({
    ...row,
    dexpressCostLyd: row.dexpressCostLyd.toString(),
    sellToSellerLyd: row.sellToSellerLyd.toString(),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAccountingAdmin(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const row = await prisma.accountingCityRate.delete({ where: { id: params.id } });
  await logAudit(session.user.id, session.user.name, "accounting.city.delete", `Deleted city rate ${row.name}`);
  return NextResponse.json({ ok: true });
}
