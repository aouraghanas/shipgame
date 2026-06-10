import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CATALOG } from "@/lib/permissions/catalog";

/**
 * Feature route prefixes → their `view` capability. Used to enforce per-user
 * page access for users whose permissions have been customized. Built once
 * from the catalog. Longest prefixes first so e.g. /confirmation-leaderboard
 * doesn't match /confirmation.
 */
const FEATURE_VIEW_GATES: { prefix: string; cap: string }[] = CATALOG.filter(
  (f) => f.routePrefix
)
  .map((f) => ({ prefix: f.routePrefix as string, cap: `${f.key}.view` }))
  .sort((a, b) => b.prefix.length - a.prefix.length);

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

  // Additive per-user permission gate: only for users whose permissions have
  // been explicitly customized (custom role or overrides). Un-customized users
  // and admins fall through to the existing role logic unchanged.
  const caps = token?.caps as string[] | undefined;
  const customized = token?.customized === true;
  if (token && customized && caps && !caps.includes("*")) {
    const gate = FEATURE_VIEW_GATES.find(
      (g) => pathname === g.prefix || pathname.startsWith(`${g.prefix}/`)
    );
    if (gate && !caps.includes(gate.cap)) {
      // Send them to the first feature they CAN view, else profile.
      const firstAllowed = FEATURE_VIEW_GATES.find((g) => caps.includes(g.cap));
      const dest = firstAllowed?.prefix ?? "/profile";
      if (pathname !== dest) {
        return NextResponse.redirect(new URL(dest, req.url));
      }
    }
  }

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
