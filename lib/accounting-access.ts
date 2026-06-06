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
 * Returns the currency the user's *balance view* is scoped to, or `null`
 * for "any". The Libyan accountant only ever sees the LYD balance card and
 * the LYD-scoped Overview / Ledger figures.
 */
export function currencyScopeFor(session: Session | null): AccountingCurrency | null {
  return isLibyanAccountant(session) ? "LYD" : null;
}

/**
 * Currencies the user may RECORD a cash operation in. The Libyan accountant
 * primarily works in LYD but also pays some sourcing/fees in USD, so they're
 * allowed to enter both — even though their balance view stays LYD-only.
 * `null` means "no restriction" (admins / regular accountants).
 */
export function allowedEntryCurrenciesFor(
  session: Session | null
): AccountingCurrency[] | null {
  return isLibyanAccountant(session) ? ["LYD", "USD"] : null;
}

/**
 * Currencies whose cash operations the user may SEE in the transactions list.
 * Matches the entry scope for the Libyan accountant (LYD + USD) so the USD
 * operations they record remain visible to them. `null` means "all".
 */
export function visibleOperationCurrenciesFor(
  session: Session | null
): AccountingCurrency[] | null {
  return isLibyanAccountant(session) ? ["LYD", "USD"] : null;
}

/** Quick calculators / AI / cities / FX / settings — denied to libyan-only. */
export function canUseAccountingTools(session: Session | null): boolean {
  return canAccessAccounting(session) && !isLibyanAccountant(session);
}
