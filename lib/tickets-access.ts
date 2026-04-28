import type { Session } from "next-auth";
import type { SupportTicket, SupportTicketRecipient, SupportTicketStatus } from "@prisma/client";

export function canUseTicketsApp(session: Session | null): boolean {
  const r = session?.user?.role;
  return r === "MANAGER" || r === "ADMIN" || r === "SOURCING_AGENT";
}

export function canCreateTicket(session: Session | null): boolean {
  const r = session?.user?.role;
  return r === "MANAGER" || r === "ADMIN";
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
  if (r === "SOURCING_AGENT") return true;
  return false;
}

/** Status, assignee, resolution — admins + sourcing handlers only (not the submitting manager). */
export function canManageTicketWorkflow(
  session: Session,
  ticket: Pick<SupportTicket, "assigneeId" | "recipient">
): boolean {
  const r = session.user.role;
  if (r === "ADMIN") return true;
  if (r === "SOURCING_AGENT") {
    if (ticket.recipient === "SOURCING_TEAM") return true;
    if (ticket.assigneeId === session.user.id) return true;
    return false;
  }
  return false;
}

/** Priority / deadline — creator manager (until archived) or workflow handlers. */
export function canEditTicketMeta(
  session: Session,
  ticket: Pick<SupportTicket, "createdById" | "assigneeId" | "recipient" | "status">
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

export function canCommentOnTicket(session: Session, ticket: Pick<SupportTicket, "createdById">): boolean {
  return canViewTicket(session, ticket);
}

export function isTerminalStatus(s: SupportTicketStatus): boolean {
  return s === "RESOLVED" || s === "ARCHIVED";
}
