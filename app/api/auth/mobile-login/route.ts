/**
 * Mobile-only login endpoint.
 *
 * Verifies email + password against the User table (same bcrypt hash the web
 * NextAuth credentials provider uses), then returns a long-lived JWT signed
 * with NEXTAUTH_SECRET so it can be verified by `getSessionFromRequest()`
 * across the same backend.
 *
 * Cookie-based auth (web) is unaffected — this route is purely additive.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signMobileToken } from "@/lib/mobile-auth";

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.trim().toLowerCase() },
  });

  if (!user || user.status === "INACTIVE") {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await signMobileToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
  });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
  });
}
