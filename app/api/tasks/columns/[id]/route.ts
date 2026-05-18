import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canManageBoardSettings } from "@/lib/tasks-access";

const patchSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  color: z.string().max(20).nullable().optional(),
  isDone: z.boolean().optional(),
  position: z.number().int().optional(),
});

/** PATCH — admin updates a column (rename, color, position, mark Done). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !(await canManageBoardSettings(session)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const col = await prisma.taskColumn.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
      ...(parsed.data.isDone !== undefined ? { isDone: parsed.data.isDone } : {}),
      ...(parsed.data.position !== undefined
        ? { position: parsed.data.position }
        : {}),
    },
  });
  return NextResponse.json(col);
}

/** DELETE — admin removes a column. Tasks in it cascade-fail; we refuse if not empty. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !(await canManageBoardSettings(session)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const remaining = await prisma.task.count({
    where: { columnId: params.id, archived: false },
  });
  if (remaining > 0) {
    return NextResponse.json(
      { error: "Move or archive the tasks in this column first." },
      { status: 400 }
    );
  }

  await prisma.taskColumn.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
