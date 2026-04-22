import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || "leaderboard";
  const role = session.user.role;
  const userId = session.user.id;
  const now = new Date();

  const notifications = await prisma.notification.findMany({
    where: {
      isActive: true,
      isDraft: false,
      OR: [{ startAt: null }, { startAt: { lte: now } }],
      AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: {
      dismissals: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  // Filter by role
  const roleFiltered = notifications.filter((n) => {
    if (!n.targetRoles || n.targetRoles.length === 0) return true;
    return n.targetRoles.includes(role);
  });

  // Filter by page
  const pageFiltered = roleFiltered.filter((n) => {
    if (!n.displayPages || n.displayPages.length === 0) return false;
    if (n.displayPages.includes("all")) return true;
    return n.displayPages.includes(page);
  });

  // Strip dismissals detail (only need isDismissed flag)
  const result = pageFiltered.map(({ dismissals, ...n }) => ({
    ...n,
    isDismissed: dismissals.length > 0,
  }));

  return NextResponse.json(result);
}
