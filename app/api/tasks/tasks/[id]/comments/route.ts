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

const postSchema = z.object({
  body: z.string().min(1).max(20_000),
});

/** POST — add a comment, notify reporter + assignees (minus author). */
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

  const actorId = session.user.id;
  const comment = await prisma.taskComment.create({
    data: {
      taskId: task.id,
      authorId: actorId,
      body: parsed.data.body.trim(),
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });

  await recordTaskActivity({
    taskId: task.id,
    actorId,
    kind: TaskActivityKind.COMMENT_ADDED,
    payload: { commentId: comment.id },
  });

  const audience = await taskAudienceUserIds(task.id, actorId);
  await notifyTaskAudience({
    userIds: audience,
    kind: UserNotificationKind.TASK_COMMENT,
    title: `New comment on: ${task.title}`,
    body: preview(parsed.data.body),
    link: `/tasks?board=${task.boardId}&task=${task.id}`,
    taskId: task.id,
  });

  return NextResponse.json(comment, { status: 201 });
}
