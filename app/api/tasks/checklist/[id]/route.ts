import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canAccessTasks, canEditBoard } from "@/lib/tasks-access";
import { recordTaskActivity } from "@/lib/task-activity";
import { TaskActivityKind } from "@prisma/client";

const patchSchema = z.object({
  label: z.string().min(1).max(300).optional(),
  done: z.boolean().optional(),
});

async function loadAndAuthorize(id: string, session: Session | null) {
  const item = await prisma.taskChecklistItem.findUnique({
    where: { id },
    include: { task: { include: { board: true } } },
  });
  if (!item) return { item: null, error: "not_found" as const };
  if (!session || !canAccessTasks(session) || !session.user?.id)
    return { item, error: "forbidden" as const };
  if (!(await canEditBoard(session, item.task.board)))
    return { item, error: "forbidden" as const };
  return { item, error: null };
}

/** PATCH — toggle done or rename. Stamps doneAt / doneBy when completed. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const { item, error } = await loadAndAuthorize(params.id, session);
  if (error === "not_found")
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (error === "forbidden" || !item)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.label !== undefined) data.label = parsed.data.label.trim();
  if (parsed.data.done !== undefined) {
    data.done = parsed.data.done;
    data.doneAt = parsed.data.done ? new Date() : null;
    data.doneById = parsed.data.done ? session?.user?.id ?? null : null;
  }

  const updated = await prisma.taskChecklistItem.update({
    where: { id: item.id },
    data,
  });

  if (parsed.data.done === true && !item.done) {
    await recordTaskActivity({
      taskId: item.taskId,
      actorId: session?.user?.id ?? null,
      kind: TaskActivityKind.CHECKLIST_ITEM_COMPLETED,
      payload: { itemId: item.id, label: updated.label },
    });
  }

  return NextResponse.json(updated);
}

/** DELETE — remove a checklist item. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const { item, error } = await loadAndAuthorize(params.id, session);
  if (error === "not_found")
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (error === "forbidden" || !item)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.taskChecklistItem.delete({ where: { id: item.id } });
  await recordTaskActivity({
    taskId: item.taskId,
    actorId: session?.user?.id ?? null,
    kind: TaskActivityKind.CHECKLIST_ITEM_REMOVED,
    payload: { itemId: item.id, label: item.label },
  });
  return NextResponse.json({ ok: true });
}
