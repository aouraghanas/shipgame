/**
 * Helpers for recording task-board activity and fanning out per-user
 * notifications. All fire-and-forget — failures are swallowed so the
 * primary mutation (move task, comment, etc.) never breaks.
 */

import { prisma } from "@/lib/prisma";
import {
  TaskActivityKind,
  UserNotificationKind,
  type Prisma,
} from "@prisma/client";

export type RecordActivityInput = {
  taskId: string;
  actorId: string | null;
  kind: TaskActivityKind;
  payload?: Prisma.InputJsonValue;
};

/** Append one activity row. Safe to await — caller controls failure semantics. */
export async function recordTaskActivity(
  input: RecordActivityInput
): Promise<void> {
  try {
    await prisma.taskActivity.create({
      data: {
        taskId: input.taskId,
        actorId: input.actorId ?? null,
        kind: input.kind,
        payload: input.payload,
      },
    });
  } catch (e) {
    console.error("[task-activity] record failed", {
      taskId: input.taskId,
      kind: input.kind,
      err: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Return the list of user ids subscribed to a task: reporter + every
 * current assignee. Optionally exclude the actor (you don't want to
 * notify yourself).
 */
export async function taskAudienceUserIds(
  taskId: string,
  excludeUserId?: string | null
): Promise<string[]> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      reporterId: true,
      assignees: { select: { userId: true } },
    },
  });
  if (!task) return [];
  const ids = new Set<string>();
  if (task.reporterId) ids.add(task.reporterId);
  for (const a of task.assignees) ids.add(a.userId);
  if (excludeUserId) ids.delete(excludeUserId);
  return Array.from(ids);
}

export type TaskNotifyInput = {
  userIds: string[];
  kind: UserNotificationKind;
  title: string;
  body?: string | null;
  link?: string | null;
  taskId?: string | null;
};

/** Bulk notify. Dedupes ids, no-ops on empty list. */
export async function notifyTaskAudience(
  input: TaskNotifyInput
): Promise<void> {
  const ids = Array.from(new Set(input.userIds.filter(Boolean)));
  if (ids.length === 0) return;
  try {
    await prisma.userNotification.createMany({
      data: ids.map((userId) => ({
        userId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        taskId: input.taskId ?? null,
      })),
    });
  } catch (e) {
    console.error("[task-activity] notify failed", {
      kind: input.kind,
      err: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Build a short preview from a longer string (for notification bodies). */
export function preview(text: string | null | undefined, max = 140): string {
  if (!text) return "";
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
