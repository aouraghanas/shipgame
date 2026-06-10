/**
 * Server-side permission guards (additive, safe).
 *
 * These honor the effective capability set (role defaults ∪ custom role ∪
 * overrides). For a user with no custom role and no overrides, the effective
 * set equals their role defaults — so these guards never change behavior for
 * un-customized users. They only bite when an admin has explicitly customized
 * someone's permissions.
 *
 * Page-access enforcement keys off the feature's `view` capability, mapped to
 * its route prefix. A null/empty override means "use role defaults".
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserCapabilities } from "./resolve";
import { CATALOG } from "./catalog";

/**
 * Used by route-group layouts. If the current user has had their permissions
 * customized AND the customization removes view access to this route prefix,
 * redirect them to their home page. Otherwise it's a no-op (existing role/layout
 * guards continue to apply unchanged).
 *
 * We only redirect on an explicit removal so we never tighten access for
 * un-customized users.
 */
export async function guardPageAccess(routePrefix: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return; // let existing layout auth handle it
  if (session.user.role === "ADMIN") return; // admins always pass

  const caps = await getUserCapabilities(session.user.id);

  // Find the feature owning this prefix.
  const feature = CATALOG.find((f) => f.routePrefix && routePrefix.startsWith(f.routePrefix));
  if (!feature) return;

  const viewCap = `${feature.key}.view`;
  if (!caps.has(viewCap)) {
    redirect("/");
  }
}

/**
 * API guard: returns true if the session user effectively has `capability`.
 * Returns true for ADMIN. For non-admins it reads the effective set.
 */
export async function sessionHasCapability(capability: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;
  if (session.user.role === "ADMIN") return true;
  const caps = await getUserCapabilities(session.user.id);
  return caps.has(capability);
}
