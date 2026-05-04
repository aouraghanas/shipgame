/**
 * Mobile-friendly auth for API routes.
 *
 * The web app uses NextAuth cookie sessions. The mobile (Expo) app cannot
 * use cookies cleanly, so it sends `Authorization: Bearer <jwt>` instead.
 * We sign / verify the bearer JWT with the same `NEXTAUTH_SECRET` the web
 * already uses, via NextAuth's own JWT helpers — so there is exactly ONE
 * secret across web + mobile.
 *
 * `getSessionFromRequest()` tries cookie session first, then bearer. It
 * returns the same `Session`-shaped object existing routes already expect,
 * so adding mobile support to a route is a one-line swap.
 */

import { decode, encode } from "next-auth/jwt";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { NextRequest } from "next/server";

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not configured");
  return s;
}

/** 30-day mobile token. Refresh by signing in again. */
const MOBILE_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function signMobileToken(payload: {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  avatarUrl: string | null;
}): Promise<string> {
  return encode({
    secret: secret(),
    token: {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      avatarUrl: payload.avatarUrl,
      mobile: true,
    },
    maxAge: MOBILE_TOKEN_MAX_AGE_SECONDS,
  });
}

function buildSessionFromToken(t: Record<string, unknown>): Session | null {
  if (!t || typeof t !== "object") return null;
  const id = t.id as string | undefined;
  if (!id) return null;
  return {
    user: {
      id,
      name: (t.name as string | null) ?? null,
      email: (t.email as string | null) ?? null,
      image: (t.picture as string | null) ?? null,
      role: (t.role as string) ?? "MANAGER",
      avatarUrl: (t.avatarUrl as string | null) ?? null,
    },
    expires: typeof t.exp === "number" ? new Date(t.exp * 1000).toISOString() : new Date(Date.now() + MOBILE_TOKEN_MAX_AGE_SECONDS * 1000).toISOString(),
  } as Session;
}

/**
 * Returns a NextAuth-compatible `Session` for the request, accepting either
 * the cookie session OR an `Authorization: Bearer <jwt>` header. Returns
 * `null` if neither is valid.
 */
export async function getSessionFromRequest(req: NextRequest): Promise<Session | null> {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (token) {
      try {
        const decoded = await decode({ token, secret: secret() });
        if (decoded) {
          const sess = buildSessionFromToken(decoded as Record<string, unknown>);
          if (sess) return sess;
        }
      } catch {
        // fall through to cookie session
      }
    }
  }
  return getServerSession(authOptions);
}
