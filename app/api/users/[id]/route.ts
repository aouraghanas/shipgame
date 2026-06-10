import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { isValidCapability } from "@/lib/permissions/catalog";
import { resolveUserCapabilities } from "@/lib/permissions/resolve";

const overridesSchema = z
  .object({
    grant: z.array(z.string()).default([]),
    deny: z.array(z.string()).default([]),
  })
  .nullable();

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z
    .enum([
      "ADMIN",
      "MANAGER",
      "SCREEN",
      "ACCOUNTANT",
      "SOURCING_AGENT",
      "LIBYAN_ACCOUNTANT",
      "TASK_AGENT",
      "CONFIRMATION_AGENT",
      "CONFIRMATION_SCREEN",
    ])
    .optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  password: z.string().min(6).optional(),
  avatarUrl: z.string().nullable().optional(),
  customRoleId: z.string().nullable().optional(),
  permissionOverrides: overridesSchema.optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  const isSelf = session.user.id === params.id;
  if (!isAdmin && !isSelf)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, email: true, name: true, role: true,
      status: true, avatarUrl: true, createdAt: true,
      customRoleId: true, permissionOverrides: true,
      customRole: { select: { capabilities: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Include the resolved effective capabilities so the admin editor can show
  // the current state (and the client can gate UI). Only admins see the
  // permission detail; self-views get the basic fields.
  const effective = Array.from(
    resolveUserCapabilities({
      role: user.role,
      customRoleCapabilities: user.customRole?.capabilities ?? null,
      overrides: user.permissionOverrides,
    })
  );

  const { customRole, ...rest } = user;
  return NextResponse.json({
    ...rest,
    customRoleCapabilities: customRole?.capabilities ?? [],
    effectiveCapabilities: effective,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  const isSelf = session.user.id === params.id;
  if (!isAdmin && !isSelf)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { password, ...rest } = parsed.data;

  // Non-admins can only update name and avatarUrl
  if (!isAdmin) {
    const { name, avatarUrl } = rest;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
    if (password) update.passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({ where: { id: params.id }, data: update });

    const changes: string[] = [];
    if (name !== undefined) changes.push(`name to "${name}"`);
    if (avatarUrl !== undefined) changes.push("avatar");
    if (password) changes.push("password");
    if (changes.length > 0) {
      await logAudit(
        session.user.id,
        session.user.name,
        "profile.update",
        `Updated ${changes.join(", ")}`
      );
    }

    return NextResponse.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl });
  }

  const { customRoleId, permissionOverrides, ...plain } = rest;
  const data: Record<string, unknown> = { ...plain };
  if (password) data.passwordHash = await bcrypt.hash(password, 12);

  // customRoleId: null clears it, a string sets it (validated by FK).
  if (customRoleId !== undefined) data.customRoleId = customRoleId;

  // permissionOverrides: sanitize to valid capability keys only; null clears.
  if (permissionOverrides !== undefined) {
    if (permissionOverrides === null) {
      data.permissionOverrides = null;
    } else {
      data.permissionOverrides = {
        grant: permissionOverrides.grant.filter(isValidCapability),
        deny: permissionOverrides.deny.filter(isValidCapability),
      };
    }
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, email: true, name: true, role: true, status: true, avatarUrl: true },
  });

  const changes = Object.keys(rest).filter((k) => rest[k as keyof typeof rest] !== undefined);
  if (password) changes.push("password");
  await logAudit(
    session.user.id,
    session.user.name,
    "user.update",
    `Updated user ${user.name}: ${changes.join(", ")}`
  );

  return NextResponse.json(user);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { name: true } });
  await prisma.user.delete({ where: { id: params.id } });

  await logAudit(
    session.user.id,
    session.user.name,
    "user.delete",
    `Deleted user ${user?.name ?? params.id}`
  );

  return NextResponse.json({ success: true });
}
