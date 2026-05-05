import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/mobile-auth";

/** Lightweight endpoint for the bell badge — returns just the unread count. */
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ unread: 0 });

  const unread = await prisma.userNotification.count({
    where: { userId: session.user.id, readAt: null },
  });

  return NextResponse.json({ unread });
}
