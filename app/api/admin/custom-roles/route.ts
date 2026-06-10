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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || notAdmin(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const roles = await prisma.customRole.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });
  return NextResponse.json(
    roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      capabilities: r.capabilities,
      userCount: r._count.users,
    }))
  );
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  capabilities: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || notAdmin(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const caps = parsed.data.capabilities.filter(isValidCapability);

  const existing = await prisma.customRole.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing)
    return NextResponse.json({ error: "A role with that name already exists." }, { status: 409 });

  const role = await prisma.customRole.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      capabilities: caps,
    },
  });

  await logAudit(
    session.user.id,
    session.user.name ?? "",
    "custom-role.create",
    `Created custom role "${role.name}" (${caps.length} capabilities)`
  );

  return NextResponse.json(role);
}
