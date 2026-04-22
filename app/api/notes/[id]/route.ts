import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  content: z.string().min(1).optional(),
  visible: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const note = await prisma.note.update({
    where: { id: params.id },
    data: parsed.data,
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "note.update",
    `Updated note ${params.id}`
  );

  return NextResponse.json(note);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.note.delete({ where: { id: params.id } });

  await logAudit(
    session.user.id,
    session.user.name,
    "note.delete",
    `Deleted note ${params.id}`
  );

  return NextResponse.json({ success: true });
}
