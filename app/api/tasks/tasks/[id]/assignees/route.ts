import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canAccessTasks, canEditBoard } from "@/lib/tasks-access";
import {
  notifyTaskAudience,
  recordTaskActivity,
} from "@/lib/task-activity";
import { TaskActivityKind, UserNotificationKind } from "@prisma/client";

const putSchema = z.object({
  userIds: z.array(z.string()),
});

/**
 * PUT /api/tasks/tasks/[id]/assignees
 *
 * Replace the assignee set. Compares old vs new, emits per-user
 * activity rows and assignment notifications.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessTasks(session) || !session.user?.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { board: true, assignees: { select: { userId: true } } },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canEditBoard(session, task.board)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const actorId = session.user.id;
  const previous = new Set(task.assignees.map((a) => a.userId));
  const nextIds = Array.from(new Set(parsed.data.userIds.filter(Boolean)));
  const nextSet = new Set(nextIds);
  const added: string[] = nextIds.filter((id) => !previous.has(id));
  const removed: string[] = Array.from(previous).filter((id) => !nextSet.has(id));

  await prisma.$transaction(async (tx) => {
    if (removed.length > 0) {
      await tx.taskAssignee.deleteMany({
        where: { taskId: task.id, userId: { in: removed } },
      });
    }
    if (added.length > 0) {
      await tx.taskAssignee.createMany({
        data: added.map((userId) => ({ taskId: task.id, userId })),
        skipDuplicates: true,
      });
    }
  });

  for (const userId of added) {
    await recordTaskActivity({
      taskId: task.id,
      actorId,
      kind: TaskActivityKind.ASSIGNEE_ADDED,
      payload: { userId },
    });
  }
  for (const userId of removed) {
    await recordTaskActivity({
      taskId: task.id,
      actorId,
      kind: TaskActivityKind.ASSIGNEE_REMOVED,
      payload: { userId },
    });
  }

  if (added.length > 0) {
    await notifyTaskAudience({
      userIds: added.filter((id) => id !== actorId),
      kind: UserNotificationKind.TASK_ASSIGNED,
      title: `Assigned to: ${task.title}`,
      link: `/tasks?board=${task.boardId}&task=${task.id}`,
      taskId: task.id,
    });
  }
  if (removed.length > 0) {
    await notifyTaskAudience({
      userIds: removed.filter((id) => id !== actorId),
      kind: UserNotificationKind.TASK_UNASSIGNED,
      title: `Unassigned from: ${task.title}`,
      link: `/tasks?board=${task.boardId}&task=${task.id}`,
      taskId: task.id,
    });
  }

  return NextResponse.json({ ok: true, added, removed });
}
