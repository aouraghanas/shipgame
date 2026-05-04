import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canUseTicketsApp } from "@/lib/tickets-access";
import { buildTicketListWhere, type TicketListQuery } from "@/lib/tickets-list-where";
import { getSessionFromRequest } from "@/lib/mobile-auth";

const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "ARCHIVED"] as const;

/** Count tickets by status for the current user's visibility (ignores status/priority filters). */
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !canUseTicketsApp(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("archived") === "1";
  const scope: TicketListQuery = {
    includeArchived,
    createdById: searchParams.get("createdBy") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
  };

  const baseWhere = buildTicketListWhere(session, scope);

  const rows = await prisma.supportTicket.groupBy({
    by: ["status"],
    where: baseWhere,
    _count: { _all: true },
  });

  const byStatus: Record<string, number> = {};
  for (const s of STATUSES) byStatus[s] = 0;
  for (const row of rows) {
    byStatus[row.status] = row._count._all;
  }

  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    byStatus,
    total,
    openPipeline: byStatus.OPEN + byStatus.IN_PROGRESS + byStatus.WAITING,
  });
}
