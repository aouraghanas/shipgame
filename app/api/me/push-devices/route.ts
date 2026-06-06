import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/mobile-auth";
import { isExpoPushToken } from "@/lib/push";
import { z } from "zod";

/**
 * Register / refresh the calling user's Expo push token.
 *
 * Mobile calls this after login + on app open with the device's Expo push
 * token. Upsert by token: if the token already exists we update ownership +
 * lastSeenAt (handles a device used by multiple accounts / re-logins).
 */
const postSchema = z.object({
  token: z.string().min(1),
  platform: z.string().max(20).optional(),
  deviceName: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { token, platform, deviceName } = parsed.data;
  if (!isExpoPushToken(token))
    return NextResponse.json({ error: "Invalid push token" }, { status: 400 });

  await prisma.pushDevice.upsert({
    where: { token },
    create: {
      token,
      userId: session.user.id,
      platform: platform ?? null,
      deviceName: deviceName ?? null,
      enabled: true,
      lastSeenAt: new Date(),
    },
    update: {
      userId: session.user.id,
      platform: platform ?? undefined,
      deviceName: deviceName ?? undefined,
      enabled: true,
      lastSeenAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}

/** Unregister a device (e.g. on logout). */
export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  await prisma.pushDevice.deleteMany({
    where: { token, userId: session.user.id },
  });
  return NextResponse.json({ ok: true });
}
