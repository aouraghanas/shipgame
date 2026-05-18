import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTasks } from "@/lib/tasks-access";

/**
 * GET /api/tasks/users
 *
 * Returns the active users who can be assigned to tasks. We exclude
 * SCREEN (kiosk role) and LIBYAN_ACCOUNTANT (scoped role) since they
 * don't have task access. Used by the assignee picker.
 */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessTasks(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: {
        in: ["ADMIN", "MANAGER", "SOURCING_AGENT", "ACCOUNTANT", "TASK_AGENT"],
      },
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json(users);
}
