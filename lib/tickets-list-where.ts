import type { Session } from "next-auth";
import type { Prisma } from "@prisma/client";
import type { SupportTicketPriority, SupportTicketStatus } from "@prisma/client";

export type TicketListQuery = {
  includeArchived?: boolean;
  status?: string | null;
  priority?: string | null;
  createdById?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

function parseDayStart(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parseDayEnd(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d, 23, 59, 59, 999);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Visibility + optional filters for ticket list & summary (same rules). */
export function buildTicketListWhere(session: Session, q: TicketListQuery): Prisma.SupportTicketWhereInput {
  const role = session.user.role;
  const parts: Prisma.SupportTicketWhereInput[] = [];

  const statusFilter =
    q.status && ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "ARCHIVED"].includes(q.status) ? q.status : null;

  if (!q.includeArchived && statusFilter !== "ARCHIVED") {
    parts.push({ status: { not: "ARCHIVED" } });
  }

  if (role === "MANAGER") {
    parts.push({
      OR: [{ createdById: session.user.id }, { assigneeId: session.user.id }],
    });
  }

  if (statusFilter) {
    parts.push({ status: statusFilter as SupportTicketStatus });
  }

  if (q.priority && ["LOW", "NORMAL", "HIGH", "URGENT"].includes(q.priority)) {
    parts.push({ priority: q.priority as SupportTicketPriority });
  }

  if (q.createdById?.trim()) {
    const id = q.createdById.trim();
    if (role === "MANAGER" && id !== session.user.id) {
      // managers cannot scope to other creators
    } else {
      parts.push({ createdById: id });
    }
  }

  if (q.dateFrom?.trim()) {
    const from = parseDayStart(q.dateFrom.trim());
    if (from) parts.push({ createdAt: { gte: from } });
  }
  if (q.dateTo?.trim()) {
    const to = parseDayEnd(q.dateTo.trim());
    if (to) parts.push({ createdAt: { lte: to } });
  }

  return parts.length ? { AND: parts } : {};
}
