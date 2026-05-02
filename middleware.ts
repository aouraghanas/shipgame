import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Sourcing agents: tickets + recommendations + read-only activity intel + profile only (no leaderboard). */
const SOURCING_PAGE_PREFIXES = ["/tickets", "/feedback", "/ops-reports", "/profile"];

/** Accountants: accounting app + tickets + profile. */
const ACCOUNTANT_PAGE_PREFIXES = ["/tickets", "/accounting", "/profile"];

/** Libyan accountants: accounting app only (LYD-scoped). */
const LIBYAN_ACCOUNTANT_PAGE_PREFIXES = ["/accounting"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role === "SOURCING_AGENT") {
    const allowed = SOURCING_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (!allowed) {
      return NextResponse.redirect(new URL("/tickets", req.url));
    }
  }

  if (token?.role === "ACCOUNTANT") {
    const allowed = ACCOUNTANT_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (!allowed) {
      return NextResponse.redirect(new URL("/accounting", req.url));
    }
  }

  if (token?.role === "LIBYAN_ACCOUNTANT") {
    const allowed = LIBYAN_ACCOUNTANT_PAGE_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    if (!allowed) {
      return NextResponse.redirect(new URL("/accounting", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
