import {
  ActivityReportScope,
  ActivityReportTrigger,
  type FeedbackReportPeriod,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getReportRange } from "@/lib/report-period";
import { analyzeActivitiesWithAI } from "@/lib/activity-ai";

function categoryBreakdown(
  rows: { category: string }[]
): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});
}

function managerBreakdown(
  rows: { manager: { id: string; name: string } }[]
): Record<string, { name: string; count: number }> {
  const m: Record<string, { name: string; count: number }> = {};
  for (const r of rows) {
    const id = r.manager.id;
    if (!m[id]) m[id] = { name: r.manager.name, count: 0 };
    m[id].count += 1;
  }
  return m;
}

export async function generateActivityReport(opts: {
  period: FeedbackReportPeriod;
  anchor: Date;
  scope: ActivityReportScope;
  sellerId?: string | null;
  managerId?: string | null;
  trigger: ActivityReportTrigger;
  createdBy: string | null;
}) {
  const { from, to } = getReportRange(opts.period, opts.anchor);

  const where: Prisma.ManagerActivityWhereInput = {
    createdAt: { gte: from, lte: to },
  };
  if (opts.managerId) where.managerId = opts.managerId;
  if (opts.scope === ActivityReportScope.SELLER && opts.sellerId) where.sellerId = opts.sellerId;

  const activities = await prisma.managerActivity.findMany({
    where,
    include: {
      manager: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 2500,
  });

  const sellerName =
    opts.scope === ActivityReportScope.SELLER && opts.sellerId
      ? activities[0]?.seller.name ?? (await prisma.seller.findUnique({ where: { id: opts.sellerId } }))?.name
      : undefined;

  const ai = await analyzeActivitiesWithAI({
    period: opts.period,
    fromDate: from,
    toDate: to,
    scope: opts.scope === ActivityReportScope.GLOBAL ? "GLOBAL" : "SELLER",
    sellerName: sellerName ?? undefined,
    activities,
  });

  const report = await prisma.activityReport.create({
    data: {
      period: opts.period,
      scope: opts.scope,
      sellerId: opts.scope === ActivityReportScope.SELLER ? opts.sellerId ?? null : null,
      fromDate: from,
      toDate: to,
      totalActivities: activities.length,
      categoryBreakdown: categoryBreakdown(activities) as object,
      managerBreakdown: managerBreakdown(activities) as object,
      insights: (ai.insights ?? {}) as object,
      summary: ai.summary,
      recommendations: ai.recommendations,
      trigger: opts.trigger,
      model: ai.model,
      createdBy: opts.createdBy,
    },
    include: {
      creator: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
    },
  });

  return report;
}

export async function generateGlobalPlusTopSellers(opts: {
  period: FeedbackReportPeriod;
  anchor: Date;
  managerId?: string | null;
  trigger: ActivityReportTrigger;
  createdBy: string | null;
  maxSellers: number;
}) {
  const { from, to } = getReportRange(opts.period, opts.anchor);
  const whereBase: Prisma.ManagerActivityWhereInput = {
    createdAt: { gte: from, lte: to },
  };
  if (opts.managerId) whereBase.managerId = opts.managerId;

  const globalReport = await generateActivityReport({
    period: opts.period,
    anchor: opts.anchor,
    scope: ActivityReportScope.GLOBAL,
    managerId: opts.managerId,
    trigger: opts.trigger,
    createdBy: opts.createdBy,
  });

  const grouped = await prisma.managerActivity.groupBy({
    by: ["sellerId"],
    where: whereBase,
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: Math.max(0, Math.min(opts.maxSellers, 50)),
  });

  const sellerReports = [];
  for (const row of grouped) {
    const r = await generateActivityReport({
      period: opts.period,
      anchor: opts.anchor,
      scope: ActivityReportScope.SELLER,
      sellerId: row.sellerId,
      managerId: opts.managerId,
      trigger: opts.trigger,
      createdBy: opts.createdBy,
    });
    sellerReports.push(r);
  }

  return { globalReport, sellerReports };
}
