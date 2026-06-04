import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Sourcing agents: tickets + tasks + recommendations + read-only activity intel + profile only (no leaderboard). */
const SOURCING_PAGE_PREFIXES = ["/tickets", "/tasks", "/feedback", "/ops-reports", "/profile"];

/** Accountants: accounting app + tickets + tasks + profile. */
const ACCOUNTANT_PAGE_PREFIXES = ["/tickets", "/tasks", "/accounting", "/profile"];

/** Libyan accountants: accounting app only (LYD-scoped). */
const LIBYAN_ACCOUNTANT_PAGE_PREFIXES = ["/accounting"];

/** Task agents: the task manager only — that's their whole app. */
const TASK_AGENT_PAGE_PREFIXES = ["/tasks"];

/** Confirmation agents (call center): their own dashboard/leaderboard/activity/feedback + tickets + tasks + profile. */
const CONFIRMATION_AGENT_PAGE_PREFIXES = [
  "/confirmation",
  "/confirmation-leaderboard",
  "/confirmation-activity",
  "/confirmation-feedback",
  "/tickets",
  "/tasks",
  "/profile",
];

/** Confirmation screen: the Libya call-center TV leaderboard only. */
const CONFIRMATION_SCREEN_PAGE_PREFIXES = ["/confirmation-screen"];

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

  if (token?.role === "TASK_AGENT") {
    const allowed = TASK_AGENT_PAGE_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    if (!allowed) {
      return NextResponse.redirect(new URL("/tasks", req.url));
    }
  }

  if (token?.role === "CONFIRMATION_AGENT") {
    const allowed = CONFIRMATION_AGENT_PAGE_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    if (!allowed) {
      return NextResponse.redirect(new URL("/confirmation", req.url));
    }
  }

  if (token?.role === "CONFIRMATION_SCREEN") {
    const allowed = CONFIRMATION_SCREEN_PAGE_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    if (!allowed) {
      return NextResponse.redirect(new URL("/confirmation-screen", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
