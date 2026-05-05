import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/mobile-auth";

/**
 * Lists the current user's inbox notifications, newest first.
 *
 * Query params:
 *   take=N     (default 30, max 100)
 *   unread=1   (only unread)
 */
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const take = Math.min(Math.max(Number(sp.get("take") || "30"), 1), 100);
  const unreadOnly = sp.get("unread") === "1";

  const items = await prisma.userNotification.findMany({
    where: {
      userId: session.user.id,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  const unread = unreadOnly
    ? items.length
    : await prisma.userNotification.count({
        where: { userId: session.user.id, readAt: null },
      });

  return NextResponse.json({ items, unread });
}
