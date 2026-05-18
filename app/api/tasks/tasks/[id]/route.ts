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
  taskAudienceUserIds,
} from "@/lib/task-activity";
import { TaskActivityKind, UserNotificationKind } from "@prisma/client";

/** GET /api/tasks/tasks/[id] — full task detail incl. comments and activity. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessTasks(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      board: true,
      column: true,
      reporter: { select: { id: true, name: true, avatarUrl: true } },
      assignees: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, role: true } },
        },
      },
      labels: {
        include: { label: { select: { id: true, name: true, color: true } } },
      },
      checklist: { orderBy: { position: "asc" } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true, role: true } },
        },
      },
      activity: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          actor: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canEditBoard(session, task.board)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    id: task.id,
    boardId: task.boardId,
    columnId: task.columnId,
    column: task.column,
    title: task.title,
    description: task.description,
    priority: task.priority,
    position: task.position,
    dueAt: task.dueAt,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    archived: task.archived,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    reporter: task.reporter,
    assignees: task.assignees.map((a) => a.user),
    labels: task.labels.map((l) => l.label),
    checklist: task.checklist,
    comments: task.comments,
    activity: task.activity,
  });
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10_000).nullable().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  archived: z.boolean().optional(),
});

/** PATCH — edit title / description / priority / due / archive flag. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessTasks(session) || !session.user?.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.task.findUnique({
    where: { id: params.id },
    include: { board: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canEditBoard(session, existing.board)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title.trim();
  if (parsed.data.description !== undefined)
    data.description = parsed.data.description?.trim() || null;
  if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
  if (parsed.data.dueAt !== undefined)
    data.dueAt = parsed.data.dueAt ? new Date(parsed.data.dueAt) : null;
  if (parsed.data.archived !== undefined) data.archived = parsed.data.archived;

  const updated = await prisma.task.update({
    where: { id: existing.id },
    data,
  });

  // Activity log entries — granular so the timeline is readable.
  const actorId = session.user.id;
  if (parsed.data.title !== undefined && parsed.data.title.trim() !== existing.title) {
    await recordTaskActivity({
      taskId: updated.id,
      actorId,
      kind: TaskActivityKind.TITLE_CHANGED,
      payload: { from: existing.title, to: updated.title },
    });
  }
  if (parsed.data.description !== undefined) {
    await recordTaskActivity({
      taskId: updated.id,
      actorId,
      kind: TaskActivityKind.DESCRIPTION_CHANGED,
    });
  }
  if (parsed.data.priority !== undefined && parsed.data.priority !== existing.priority) {
    await recordTaskActivity({
      taskId: updated.id,
      actorId,
      kind: TaskActivityKind.PRIORITY_CHANGED,
      payload: { from: existing.priority, to: updated.priority },
    });
  }
  if (
    parsed.data.dueAt !== undefined &&
    String(parsed.data.dueAt ?? "") !== String(existing.dueAt ?? "")
  ) {
    await recordTaskActivity({
      taskId: updated.id,
      actorId,
      kind: TaskActivityKind.DUE_DATE_CHANGED,
      payload: { dueAt: parsed.data.dueAt },
    });
  }
  if (parsed.data.archived !== undefined && parsed.data.archived !== existing.archived) {
    await recordTaskActivity({
      taskId: updated.id,
      actorId,
      kind: parsed.data.archived ? TaskActivityKind.ARCHIVED : TaskActivityKind.RESTORED,
    });
  }

  return NextResponse.json(updated);
}

/** DELETE — soft delete (archive). */
export async function DELETE(
  _req: NextRequest,
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

  await prisma.task.update({
    where: { id: task.id },
    data: { archived: true },
  });
  await recordTaskActivity({
    taskId: task.id,
    actorId: session.user.id,
    kind: TaskActivityKind.ARCHIVED,
  });

  const audience = await taskAudienceUserIds(task.id, session.user.id);
  await notifyTaskAudience({
    userIds: audience,
    kind: UserNotificationKind.TASK_STATUS_CHANGED,
    title: `Task archived: ${task.title}`,
    body: preview(task.description),
    link: `/tasks?board=${task.boardId}&task=${task.id}`,
    taskId: task.id,
  });

  return NextResponse.json({ ok: true });
}
