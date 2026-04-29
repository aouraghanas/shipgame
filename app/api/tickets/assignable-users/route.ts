import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseTicketsApp } from "@/lib/tickets-access";

/** Team list for assignee / routing (creators + admins + sourcing handlers). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canUseTicketsApp(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { in: ["ADMIN", "MANAGER", "SOURCING_AGENT", "ACCOUNTANT"] },
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(users);
}
