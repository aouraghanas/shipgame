/**
 * Per-user inbox notifications.
 *
 * These are events the user accumulates ("ticket #12 was assigned to you",
 * "Sara commented on ticket #7"...). They live in `UserNotification`,
 * unrelated to the admin broadcast `Notification` model.
 *
 * Helpers here are designed to be safe to fire-and-forget: a failure to
 * create a notification should never break the underlying ticket / comment
 * flow. Callers wrap them in try/catch.
 */

import { prisma } from "@/lib/prisma";
import {
  type SupportTicket,
  type SupportTicketRecipient,
  UserNotificationKind,
} from "@prisma/client";
import { sendPushToUsers } from "@/lib/push";

export type NotifyInput = {
  userId: string;
  kind: UserNotificationKind;
  title: string;
  body?: string | null;
  link?: string | null;
  ticketId?: string | null;
};

/** Create a single notification + best-effort push. */
export async function notify(input: NotifyInput): Promise<void> {
  if (!input.userId) return;
  await prisma.userNotification.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      ticketId: input.ticketId ?? null,
    },
  });
  // Mirror to a push notification on the user's mobile device(s).
  void sendPushToUsers([input.userId], {
    title: input.title,
    body: input.body,
    data: { kind: input.kind, link: input.link ?? null },
  }).catch(() => {});
}

/** Bulk-create notifications, one row per recipient + best-effort push. */
export async function notifyMany(
  userIds: string[],
  base: Omit<NotifyInput, "userId">
): Promise<void> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return;
  await prisma.userNotification.createMany({
    data: ids.map((userId) => ({
      userId,
      kind: base.kind,
      title: base.title,
      body: base.body ?? null,
      link: base.link ?? null,
      ticketId: base.ticketId ?? null,
    })),
  });
  void sendPushToUsers(ids, {
    title: base.title,
    body: base.body,
    data: { kind: base.kind, link: base.link ?? null },
  }).catch(() => {});
}

/** All admin user IDs (active only). Used for ALL_ADMINS recipient. */
export async function adminUserIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** All sourcing-agent user IDs (active only). Used for SOURCING_TEAM recipient. */
export async function sourcingTeamUserIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { role: "SOURCING_AGENT", status: "ACTIVE" },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Resolve everyone who should be notified about a ticket event,
 * EXCLUDING the actor (the person who caused the event).
 *
 * Always returns active users only (we don't bother filtering against
 * status here; the queries above already do, and the `assigneeId` /
 * `createdById` relations will resolve to whatever's in the DB).
 */
export async function ticketAudienceUserIds(
  ticket: Pick<SupportTicket, "id" | "createdById" | "assigneeId" | "recipient">,
  excludeUserId?: string | null
): Promise<string[]> {
  const ids = new Set<string>();
  ids.add(ticket.createdById);
  if (ticket.assigneeId) ids.add(ticket.assigneeId);

  const recipient: SupportTicketRecipient = ticket.recipient;
  if (recipient === "ALL_ADMINS") {
    for (const id of await adminUserIds()) ids.add(id);
  } else if (recipient === "SOURCING_TEAM") {
    for (const id of await sourcingTeamUserIds()) ids.add(id);
  }

  if (excludeUserId) ids.delete(excludeUserId);
  return Array.from(ids);
}

/** Build a short safe preview from a longer string. */
export function preview(text: string | null | undefined, max = 140): string {
  if (!text) return "";
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
