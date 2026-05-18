import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canAccessTasks, canEditBoard } from "@/lib/tasks-access";
import {
  notifyTaskAudience,
  preview,
  recordTaskActivity,
} from "@/lib/task-activity";
import { TaskActivityKind, UserNotificationKind } from "@prisma/client";

const postSchema = z.object({
  columnId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(10_000).optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  dueAt: z.string().datetime().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
});

/**
 * POST /api/tasks/boards/[id]/tasks
 *
 * Create a new task in a board. The caller becomes the reporter.
 * Assignees / labels can be attached up-front.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessTasks(session) || !session.user?.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const board = await prisma.taskBoard.findUnique({ where: { id: params.id } });
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canEditBoard(session, board)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Sanity: the target column must belong to this board.
  const column = await prisma.taskColumn.findUnique({
    where: { id: parsed.data.columnId },
  });
  if (!column || column.boardId !== board.id) {
    return NextResponse.json(
      { error: "Column does not belong to this board." },
      { status: 400 }
    );
  }

  // Append at the bottom of the target column.
  const max = await prisma.task.aggregate({
    where: { columnId: column.id, archived: false },
    _max: { position: true },
  });
  const nextPosition = (max._max.position ?? -1) + 1;

  const reporterId = session.user.id;
  const assigneeIds = Array.from(
    new Set((parsed.data.assigneeIds ?? []).filter(Boolean))
  );
  const labelIds = Array.from(
    new Set((parsed.data.labelIds ?? []).filter(Boolean))
  );

  const task = await prisma.task.create({
    data: {
      boardId: board.id,
      columnId: column.id,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      priority: parsed.data.priority ?? "NORMAL",
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      position: nextPosition,
      reporterId,
      assignees: assigneeIds.length
        ? { createMany: { data: assigneeIds.map((userId) => ({ userId })) } }
        : undefined,
      labels: labelIds.length
        ? {
            createMany: {
              data: labelIds.map((labelId) => ({ labelId })),
            },
          }
        : undefined,
    },
    include: {
      reporter: { select: { id: true, name: true, avatarUrl: true } },
      assignees: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
      labels: {
        include: { label: { select: { id: true, name: true, color: true } } },
      },
    },
  });

  await recordTaskActivity({
    taskId: task.id,
    actorId: reporterId,
    kind: TaskActivityKind.CREATED,
    payload: { title: task.title, columnId: task.columnId },
  });

  if (assigneeIds.length > 0) {
    await notifyTaskAudience({
      userIds: assigneeIds.filter((id) => id !== reporterId),
      kind: UserNotificationKind.TASK_ASSIGNED,
      title: `Assigned to: ${task.title}`,
      body: preview(task.description),
      link: `/tasks?board=${board.id}&task=${task.id}`,
      taskId: task.id,
    });
    for (const userId of assigneeIds) {
      await recordTaskActivity({
        taskId: task.id,
        actorId: reporterId,
        kind: TaskActivityKind.ASSIGNEE_ADDED,
        payload: { userId },
      });
    }
  }

  return NextResponse.json(
    {
      id: task.id,
      boardId: task.boardId,
      columnId: task.columnId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      position: task.position,
      dueAt: task.dueAt,
      reporter: task.reporter,
      assignees: task.assignees.map((a) => a.user),
      labels: task.labels.map((l) => l.label),
    },
    { status: 201 }
  );
}
