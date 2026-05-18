import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canAccessTasks, canEditBoard } from "@/lib/tasks-access";
import {
  notifyTaskAudience,
  recordTaskActivity,
  taskAudienceUserIds,
} from "@/lib/task-activity";
import { TaskActivityKind, UserNotificationKind } from "@prisma/client";

const moveSchema = z.object({
  toColumnId: z.string().min(1),
  /**
   * Index inside `toColumnId` (0-based). Inserts the task at that index;
   * other tasks in the column shift down. If omitted, append to the end.
   */
  toIndex: z.number().int().min(0).optional(),
});

/**
 * POST /api/tasks/tasks/[id]/move
 *
 * Moves a task to another (or the same) column and reindexes affected
 * rows. Done in a transaction so positions stay contiguous and the
 * activity log captures both the from/to column for status changes.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessTasks(session) || !session.user?.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { board: true, column: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canEditBoard(session, task.board)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = moveSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const toCol = await prisma.taskColumn.findUnique({
    where: { id: parsed.data.toColumnId },
  });
  if (!toCol || toCol.boardId !== task.boardId) {
    return NextResponse.json(
      { error: "Target column does not belong to this board." },
      { status: 400 }
    );
  }

  const sameCol = task.columnId === toCol.id;
  const actorId = session.user.id;

  await prisma.$transaction(async (tx) => {
    // Step 1: lift the moving task out of its current column.
    if (!sameCol) {
      await tx.task.updateMany({
        where: {
          columnId: task.columnId,
          position: { gt: task.position },
          archived: false,
        },
        data: { position: { decrement: 1 } },
      });
    }

    // Step 2: figure out the target index.
    const peers = await tx.task.findMany({
      where: {
        columnId: toCol.id,
        archived: false,
        ...(sameCol ? { id: { not: task.id } } : {}),
      },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    const desiredIndex = Math.max(
      0,
      Math.min(parsed.data.toIndex ?? peers.length, peers.length)
    );

    // Step 3: bump every peer at or after desiredIndex.
    if (desiredIndex < peers.length) {
      await tx.task.updateMany({
        where: {
          columnId: toCol.id,
          archived: false,
          position: { gte: desiredIndex },
          ...(sameCol ? { id: { not: task.id } } : {}),
        },
        data: { position: { increment: 1 } },
      });
    }

    // Step 4: drop the moving task into its new slot.
    await tx.task.update({
      where: { id: task.id },
      data: {
        columnId: toCol.id,
        position: desiredIndex,
        startedAt:
          task.startedAt ?? (!task.column.isDone && toCol.isDone ? null : task.startedAt),
        completedAt: toCol.isDone ? new Date() : null,
      },
    });

    if (!sameCol) {
      await tx.taskActivity.create({
        data: {
          taskId: task.id,
          actorId,
          kind: TaskActivityKind.STATUS_CHANGED,
          payload: {
            fromColumnId: task.columnId,
            toColumnId: toCol.id,
            fromColumnName: task.column.name,
            toColumnName: toCol.name,
          },
        },
      });
    }
  });

  if (!sameCol) {
    const audience = await taskAudienceUserIds(task.id, actorId);
    await notifyTaskAudience({
      userIds: audience,
      kind: UserNotificationKind.TASK_STATUS_CHANGED,
      title: `Moved to ${toCol.name}: ${task.title}`,
      link: `/tasks?board=${task.boardId}&task=${task.id}`,
      taskId: task.id,
    });
  }

  void recordTaskActivity; // keep import used regardless of branch
  return NextResponse.json({ ok: true });
}
