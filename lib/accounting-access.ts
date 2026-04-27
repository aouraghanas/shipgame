import type { Session } from "next-auth";

export function canAccessAccounting(session: Session | null): boolean {
  const r = session?.user?.role;
  return r === "ADMIN" || r === "ACCOUNTANT";
}

export function isAccountingAdmin(session: Session | null): boolean {
  return session?.user?.role === "ADMIN";
}
