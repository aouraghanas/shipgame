/**
 * Mobile mirror of the web's role-based UI guards. The backend still
 * enforces the real rules; this is only used to decide what to render.
 */

import type { Role } from "./types";

export function canUseTicketsApp(role: Role | undefined | null): boolean {
  if (!role) return false;
  return ["ADMIN", "MANAGER", "SOURCING_AGENT", "ACCOUNTANT"].includes(role);
}

export function canCreateTicket(role: Role | undefined | null): boolean {
  return canUseTicketsApp(role);
}

export function canSeeLeaderboard(role: Role | undefined | null): boolean {
  if (!role) return false;
  return ["ADMIN", "MANAGER"].includes(role);
}

export function canSeeAccountingTab(role: Role | undefined | null): boolean {
  if (!role) return false;
  return ["ADMIN", "ACCOUNTANT", "LIBYAN_ACCOUNTANT"].includes(role);
}

/** Default landing screen per role. */
export function homeRouteFor(role: Role | undefined | null): string {
  if (role === "MANAGER" || role === "ADMIN") return "/(tabs)/home";
  if (role === "ACCOUNTANT" || role === "LIBYAN_ACCOUNTANT") return "/(tabs)/home";
  if (role === "SOURCING_AGENT") return "/(tabs)/tickets";
  return "/(tabs)/home";
}
