import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canAccessTasks, isTaskAdmin } from "@/lib/tasks-access";

const patchSchema = z.object({
  body: z.string().min(1).max(20_000),
});

/** PATCH — edit own comment. Admins can edit any comment too. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessTasks(session) || !session.user?.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const comment = await prisma.taskComment.findUnique({
    where: { id: params.id },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.authorId !== session.user.id && !isTaskAdmin(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.taskComment.update({
    where: { id: comment.id },
    data: { body: parsed.data.body.trim(), editedAt: new Date() },
  });
  return NextResponse.json(updated);
}

/** DELETE — delete own comment (or any, if admin). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessTasks(session) || !session.user?.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const comment = await prisma.taskComment.findUnique({
    where: { id: params.id },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.authorId !== session.user.id && !isTaskAdmin(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.taskComment.delete({ where: { id: comment.id } });
  return NextResponse.json({ ok: true });
}
