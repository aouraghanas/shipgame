import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseTicketsApp } from "@/lib/tickets-access";
import type { Role } from "@prisma/client";

/** Team list for assignee / routing (creators + admins + sourcing handlers). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canUseTicketsApp(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Confirmation agents work in a separate team (the Libya call center) and
  // shouldn't see or assign to account managers / sourcing / accounting. They
  // only get their own team plus admins.
  const assignableRoles: Role[] =
    session.user.role === "CONFIRMATION_AGENT"
      ? ["ADMIN", "CONFIRMATION_AGENT"]
      : ["ADMIN", "MANAGER", "SOURCING_AGENT", "ACCOUNTANT"];

  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { in: assignableRoles },
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(users);
}
