import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { isValidCapability } from "@/lib/permissions/catalog";

function notAdmin(role?: string) {
  return role !== "ADMIN";
}

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(300).nullable().optional(),
  capabilities: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || notAdmin(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.capabilities !== undefined)
    data.capabilities = parsed.data.capabilities.filter(isValidCapability);

  const role = await prisma.customRole.update({ where: { id: params.id }, data });

  await logAudit(
    session.user.id,
    session.user.name ?? "",
    "custom-role.update",
    `Updated custom role "${role.name}"`
  );

  return NextResponse.json(role);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || notAdmin(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const role = await prisma.customRole.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  // Users referencing it get customRoleId set to null (onDelete: SetNull).
  await prisma.customRole.delete({ where: { id: params.id } });

  await logAudit(
    session.user.id,
    session.user.name ?? "",
    "custom-role.delete",
    `Deleted custom role "${role?.name ?? params.id}"`
  );

  return NextResponse.json({ success: true });
}
