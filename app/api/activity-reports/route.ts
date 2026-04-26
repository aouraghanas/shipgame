import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import {
  ActivityReportScope as ScopeEnum,
  ActivityReportTrigger as TriggerEnum,
  type ActivityReportScope,
  type ActivityReportTrigger,
  type FeedbackReportPeriod,
} from "@prisma/client";
import { generateActivityReport, generateGlobalPlusTopSellers } from "@/lib/activity-report-service";

const PERIOD_VALUES = ["DAILY", "WEEKLY", "MONTHLY"] as const;
const SCOPE_VALUES = ["GLOBAL", "SELLER"] as const;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period");
  const scope = searchParams.get("scope");
  const sellerId = searchParams.get("sellerId");
  const trigger = searchParams.get("trigger");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const take = Math.min(Number(searchParams.get("take") || "120"), 400);

  const where: {
    period?: FeedbackReportPeriod;
    scope?: ActivityReportScope;
    sellerId?: string;
    trigger?: ActivityReportTrigger;
    fromDate?: { gte?: Date };
    toDate?: { lte?: Date };
  } = {};

  if (period && PERIOD_VALUES.includes(period as (typeof PERIOD_VALUES)[number])) {
    where.period = period as FeedbackReportPeriod;
  }
  if (scope && SCOPE_VALUES.includes(scope as (typeof SCOPE_VALUES)[number])) {
    where.scope = scope as ActivityReportScope;
  }
  if (sellerId) where.sellerId = sellerId;
  if (trigger === "MANUAL" || trigger === "SCHEDULED") where.trigger = trigger;

  if (from) where.fromDate = { gte: new Date(from) };
  if (to) where.toDate = { lte: new Date(to + "T23:59:59.999Z") };

  const rows = await prisma.activityReport.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
    },
    orderBy: { generatedAt: "desc" },
    take,
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const schema = z.object({
    period: z.enum(PERIOD_VALUES),
    anchorDate: z.string().optional(),
    scope: z.enum(SCOPE_VALUES),
    sellerId: z.string().optional(),
    managerId: z.string().optional(),
    includeTopSellers: z.number().int().min(0).max(50).optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const anchor = parsed.data.anchorDate ? new Date(parsed.data.anchorDate) : new Date();
  const top = parsed.data.includeTopSellers ?? 0;

  if (parsed.data.scope === "SELLER" && !parsed.data.sellerId) {
    return NextResponse.json({ error: "sellerId is required for SELLER scope" }, { status: 400 });
  }
  if (top > 0 && parsed.data.scope !== "GLOBAL") {
    return NextResponse.json({ error: "includeTopSellers only applies to GLOBAL scope" }, { status: 400 });
  }

  if (top > 0) {
    const { globalReport, sellerReports } = await generateGlobalPlusTopSellers({
      period: parsed.data.period,
      anchor,
      managerId: parsed.data.managerId,
      trigger: TriggerEnum.MANUAL,
      createdBy: session.user.id,
      maxSellers: top,
    });
    await logAudit(
      session.user.id,
      session.user.name,
      "activityReport.generateBundle",
      `Generated global + ${sellerReports.length} seller activity AI reports (${parsed.data.period})`
    );
    return NextResponse.json({ reports: [globalReport, ...sellerReports] }, { status: 201 });
  }

  const report = await generateActivityReport({
    period: parsed.data.period,
    anchor,
    scope: parsed.data.scope === "GLOBAL" ? ScopeEnum.GLOBAL : ScopeEnum.SELLER,
    sellerId: parsed.data.sellerId,
    managerId: parsed.data.managerId,
    trigger: TriggerEnum.MANUAL,
    createdBy: session.user.id,
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "activityReport.generate",
    `Generated ${parsed.data.scope.toLowerCase()} activity AI report (${parsed.data.period})`
  );

  return NextResponse.json({ reports: [report] }, { status: 201 });
}
