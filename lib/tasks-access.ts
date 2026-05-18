/**
 * Task manager access control.
 *
 * Roles allowed in the task manager:
 *   - ADMIN              → full access to every board
 *   - MANAGER            → can view/edit boards visible to them
 *   - SOURCING_AGENT     → same as MANAGER
 *   - ACCOUNTANT         → same as MANAGER
 *   - SCREEN, LIBYAN_*   → no access
 *
 * Board visibility:
 *   PUBLIC      → every authenticated task-app user
 *   TEAM_ONLY   → admins + explicit board members
 *   PRIVATE     → admins only
 */

import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import type { Role, TaskBoard, TaskBoardVisibility } from "@prisma/client";

const TASK_ROLES: Role[] = ["ADMIN", "MANAGER", "SOURCING_AGENT", "ACCOUNTANT"];

export function canAccessTasks(session: Session | null): boolean {
  if (!session?.user?.role) return false;
  return TASK_ROLES.includes(session.user.role as Role);
}

export function isTaskAdmin(session: Session | null): boolean {
  return session?.user?.role === "ADMIN";
}

/**
 * Given a board (and the current user's session) decide whether they
 * should see it. Admins always see everything.
 */
export async function canSeeBoard(
  session: Session | null,
  board: Pick<TaskBoard, "id" | "visibility">
): Promise<boolean> {
  if (!canAccessTasks(session)) return false;
  if (isTaskAdmin(session)) return true;
  const visibility = board.visibility as TaskBoardVisibility;
  if (visibility === "PUBLIC") return true;
  if (visibility === "PRIVATE") return false;
  // TEAM_ONLY → must be an explicit member.
  const userId = session?.user?.id;
  if (!userId) return false;
  const member = await prisma.taskBoardMember.findUnique({
    where: { boardId_userId: { boardId: board.id, userId } },
  });
  return !!member;
}

/**
 * Edit rights on a board. Anyone who can see it can also edit its tasks
 * in v1; only admins can change board-level settings (columns, members,
 * etc.). That keeps the UX simple — teams self-organize within boards.
 */
export async function canEditBoard(
  session: Session | null,
  board: Pick<TaskBoard, "id" | "visibility">
): Promise<boolean> {
  return canSeeBoard(session, board);
}

export async function canManageBoardSettings(
  session: Session | null,
  _board?: Pick<TaskBoard, "id" | "visibility">
): Promise<boolean> {
  return isTaskAdmin(session);
}
