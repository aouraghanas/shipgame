import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canAccessTasks, canEditBoard } from "@/lib/tasks-access";
import { recordTaskActivity } from "@/lib/task-activity";
import { TaskActivityKind } from "@prisma/client";

const postSchema = z.object({
  label: z.string().min(1).max(300),
});

/** POST — add a new checklist item at the end. */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessTasks(session) || !session.user?.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { board: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canEditBoard(session, task.board)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const max = await prisma.taskChecklistItem.aggregate({
    where: { taskId: task.id },
    _max: { position: true },
  });

  const item = await prisma.taskChecklistItem.create({
    data: {
      taskId: task.id,
      label: parsed.data.label.trim(),
      position: (max._max.position ?? -1) + 1,
    },
  });

  await recordTaskActivity({
    taskId: task.id,
    actorId: session.user.id,
    kind: TaskActivityKind.CHECKLIST_ITEM_ADDED,
    payload: { itemId: item.id, label: item.label },
  });

  return NextResponse.json(item, { status: 201 });
}
