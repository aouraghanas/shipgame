import type { Session } from "next-auth";
import type { SupportTicket, SupportTicketRecipient, SupportTicketStatus } from "@prisma/client";

export function canUseTicketsApp(session: Session | null): boolean {
  const r = session?.user?.role;
  return r === "MANAGER" || r === "ADMIN" || r === "SOURCING_AGENT" || r === "ACCOUNTANT";
}

export function canCreateTicket(session: Session | null): boolean {
  const r = session?.user?.role;
  return r === "MANAGER" || r === "ADMIN" || r === "SOURCING_AGENT" || r === "ACCOUNTANT";
}

export function canViewTicket(
  session: Session,
  ticket: Pick<SupportTicket, "createdById" | "assigneeId" | "recipient">
): boolean {
  const r = session.user.role;
  if (r === "ADMIN") return true;
  if (r === "MANAGER") {
    return ticket.createdById === session.user.id || ticket.assigneeId === session.user.id;
  }
  /** Full queue read for triage; workflow/meta still use canManageTicketWorkflow / canEditTicketMeta. */
  if (r === "SOURCING_AGENT" || r === "ACCOUNTANT") return true;
  return false;
}

/** Status, assignee, resolution — admins + role-specific handlers (not the submitting manager). */
export function canManageTicketWorkflow(
  session: Session,
  ticket: Pick<SupportTicket, "assigneeId" | "recipient" | "subject">
): boolean {
  const r = session.user.role;
  if (r === "ADMIN") return true;
  if (r === "SOURCING_AGENT") {
    if (ticket.recipient === "SOURCING_TEAM") return true;
    if (ticket.assigneeId === session.user.id) return true;
    return false;
  }
  if (r === "ACCOUNTANT") {
    if (ticket.subject === "ACCOUNTING") return true;
    if (ticket.assigneeId === session.user.id) return true;
    return false;
  }
  return false;
}

/** Priority / deadline — creator manager (until archived) or workflow handlers. */
export function canEditTicketMeta(
  session: Session,
  ticket: Pick<SupportTicket, "createdById" | "assigneeId" | "recipient" | "status" | "subject">
): boolean {
  if (canManageTicketWorkflow(session, ticket)) return true;
  if (
    session.user.role === "MANAGER" &&
    ticket.createdById === session.user.id &&
    ticket.status !== "ARCHIVED"
  ) {
    return true;
  }
  return false;
}

export function canCommentOnTicket(
  session: Session,
  ticket: Pick<SupportTicket, "createdById" | "assigneeId" | "recipient">
): boolean {
  return canViewTicket(session, ticket);
}

export function isTerminalStatus(s: SupportTicketStatus): boolean {
  return s === "RESOLVED" || s === "ARCHIVED";
}
