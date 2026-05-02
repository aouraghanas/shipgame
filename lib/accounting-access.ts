import type { Session } from "next-auth";
import type { AccountingCurrency } from "@prisma/client";

/** Anyone who can open the accounting app at all. */
export function canAccessAccounting(session: Session | null): boolean {
  const r = session?.user?.role;
  return r === "ADMIN" || r === "ACCOUNTANT" || r === "LIBYAN_ACCOUNTANT";
}

/** Full-power admin (delete ledger lines, edit settings/cities/FX). */
export function isAccountingAdmin(session: Session | null): boolean {
  return session?.user?.role === "ADMIN";
}

/**
 * Libyan accountant role — restricted to the LYD currency only.
 * Sees: Overview + Ledger (LYD only). Cannot see USD / MAD figures,
 * cannot use Quick calculators / AI report / Fees & FX admin tab.
 */
export function isLibyanAccountant(session: Session | null): boolean {
  return session?.user?.role === "LIBYAN_ACCOUNTANT";
}

/**
 * Returns the currency the user is allowed to read/write, or `null`
 * to mean "any". Today only LIBYAN_ACCOUNTANT is scoped (to LYD).
 */
export function currencyScopeFor(session: Session | null): AccountingCurrency | null {
  return isLibyanAccountant(session) ? "LYD" : null;
}

/** Quick calculators / AI / cities / FX / settings — denied to libyan-only. */
export function canUseAccountingTools(session: Session | null): boolean {
  return canAccessAccounting(session) && !isLibyanAccountant(session);
}
