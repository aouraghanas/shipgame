import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canAccessTasks, canEditBoard } from "@/lib/tasks-access";
import { recordTaskActivity } from "@/lib/task-activity";
import { TaskActivityKind } from "@prisma/client";

const putSchema = z.object({
  labelIds: z.array(z.string()),
});

/** PUT — replace the label set on a task (validates labels belong to board). */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessTasks(session) || !session.user?.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { board: true, labels: { select: { labelId: true } } },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canEditBoard(session, task.board)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Only allow labels that actually belong to this board.
  const validLabels = await prisma.taskLabel.findMany({
    where: { boardId: task.boardId, id: { in: parsed.data.labelIds } },
    select: { id: true, name: true },
  });
  const validIds = new Set(validLabels.map((l) => l.id));
  const next = parsed.data.labelIds.filter((id) => validIds.has(id));
  const previous = new Set(task.labels.map((l) => l.labelId));
  const added = next.filter((id) => !previous.has(id));
  const removed = Array.from(previous).filter((id) => !next.includes(id));

  await prisma.$transaction(async (tx) => {
    if (removed.length > 0) {
      await tx.taskLabelAssignment.deleteMany({
        where: { taskId: task.id, labelId: { in: removed } },
      });
    }
    if (added.length > 0) {
      await tx.taskLabelAssignment.createMany({
        data: added.map((labelId) => ({ taskId: task.id, labelId })),
        skipDuplicates: true,
      });
    }
  });

  const actorId = session.user.id;
  for (const id of added) {
    await recordTaskActivity({
      taskId: task.id,
      actorId,
      kind: TaskActivityKind.LABEL_ADDED,
      payload: { labelId: id },
    });
  }
  for (const id of removed) {
    await recordTaskActivity({
      taskId: task.id,
      actorId,
      kind: TaskActivityKind.LABEL_REMOVED,
      payload: { labelId: id },
    });
  }

  return NextResponse.json({ ok: true, added, removed });
}
