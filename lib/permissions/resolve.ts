/**
 * Effective-permission resolver.
 *
 * effective = roleDefaults ∪ customRoleCaps ∪ overrides.grant  −  overrides.deny
 *
 * ADMIN always resolves to "*" (every capability) and can never be locked out.
 *
 * Two entry points:
 *  - `resolveUserCapabilities(...)` — pure, works from already-loaded inputs
 *    (used by the session/client and after a DB read).
 *  - `getUserCapabilities(userId)` — server-side, loads the user + custom role
 *    from the DB. Use in API routes / server components.
 */

import type { Role } from "@prisma/client";
import { ROLE_DEFAULTS, ALL_CAPABILITIES } from "./catalog";

export type PermissionOverrides = { grant: string[]; deny: string[] };

export function parseOverrides(value: unknown): PermissionOverrides {
  if (value && typeof value === "object") {
    const v = value as { grant?: unknown; deny?: unknown };
    const grant = Array.isArray(v.grant) ? v.grant.filter((x): x is string => typeof x === "string") : [];
    const deny = Array.isArray(v.deny) ? v.deny.filter((x): x is string => typeof x === "string") : [];
    return { grant, deny };
  }
  return { grant: [], deny: [] };
}

export type ResolveInput = {
  role: Role | string;
  customRoleCapabilities?: string[] | null;
  overrides?: PermissionOverrides | unknown;
};

/**
 * Compute the full set of capability keys a user effectively has.
 * Returns a Set for O(1) lookups.
 */
export function resolveUserCapabilities(input: ResolveInput): Set<string> {
  if (input.role === "ADMIN") {
    return new Set(ALL_CAPABILITIES);
  }

  const set = new Set<string>();

  // 1. base role defaults
  const defaults = ROLE_DEFAULTS[input.role as Role] ?? [];
  if (defaults[0] === "*") {
    return new Set(ALL_CAPABILITIES);
  }
  for (const cap of defaults) set.add(cap);

  // 2. custom role capabilities
  if (input.customRoleCapabilities) {
    for (const cap of input.customRoleCapabilities) set.add(cap);
  }

  // 3. per-user overrides
  const overrides = parseOverrides(input.overrides);
  for (const cap of overrides.grant) set.add(cap);
  for (const cap of overrides.deny) set.delete(cap);

  return set;
}

export function hasCapability(caps: Set<string>, capability: string): boolean {
  return caps.has(capability);
}

/**
 * The "free" capabilities a user gets from base role + custom role, BEFORE
 * per-user overrides. Used by the editor to compute minimal grant/deny diffs
 * and to mark which toggles come from the role.
 */
export function baselineCapabilities(
  role: Role | string,
  customRoleCapabilities?: string[] | null
): Set<string> {
  if (role === "ADMIN") return new Set(ALL_CAPABILITIES);
  const set = new Set<string>();
  const defaults = ROLE_DEFAULTS[role as Role] ?? [];
  if (defaults[0] === "*") return new Set(ALL_CAPABILITIES);
  for (const cap of defaults) set.add(cap);
  if (customRoleCapabilities) for (const cap of customRoleCapabilities) set.add(cap);
  return set;
}

/**
 * Given the desired effective set and the baseline, compute the minimal
 * grant/deny override lists to persist.
 */
export function diffOverrides(
  desired: Set<string>,
  baseline: Set<string>
): PermissionOverrides {
  const grant: string[] = [];
  const deny: string[] = [];
  for (const cap of desired) if (!baseline.has(cap)) grant.push(cap);
  for (const cap of baseline) if (!desired.has(cap)) deny.push(cap);
  return { grant, deny };
}

/** Server-side: load a user's effective capabilities from the DB. */
export async function getUserCapabilities(userId: string): Promise<Set<string>> {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      permissionOverrides: true,
      customRole: { select: { capabilities: true } },
    },
  });
  if (!user) return new Set();
  return resolveUserCapabilities({
    role: user.role,
    customRoleCapabilities: user.customRole?.capabilities ?? null,
    overrides: user.permissionOverrides,
  });
}

/**
 * Server-side guard: does the given session user have `capability`?
 *
 * This is ADDITIVE — call it where you want to *also* honor custom
 * permissions. It does not replace existing role checks; it reads the same
 * effective set (which, for un-customized users, equals their role defaults).
 */
export async function userHasCapability(
  userId: string,
  capability: string
): Promise<boolean> {
  const caps = await getUserCapabilities(userId);
  return caps.has(capability);
}
