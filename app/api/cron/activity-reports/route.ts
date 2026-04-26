import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shouldSkipAutoRun } from "@/lib/report-period";
import { ActivityReportTrigger } from "@prisma/client";
import { generateGlobalPlusTopSellers } from "@/lib/activity-report-service";

function authorize(req: NextRequest) {
  const header = req.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const q = new URL(req.url).searchParams.get("secret");
  const token = bearer || q;
  const expected = process.env.CRON_SECRET;
  if (!expected || token !== expected) return false;
  return true;
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const automation = await prisma.activityReportAutomation.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", autoEnabled: false, autoPeriod: "DAILY" },
    update: {},
  });

  if (!automation.autoEnabled) {
    return NextResponse.json({ skipped: true, reason: "automation_disabled" });
  }

  const now = new Date();
  if (shouldSkipAutoRun(automation.lastAutoRunAt, automation.autoPeriod, now)) {
    return NextResponse.json({
      skipped: true,
      reason: "already_ran_for_period",
      lastAutoRunAt: automation.lastAutoRunAt,
    });
  }

  const maxSellers = Math.min(
    Math.max(0, Number(process.env.ACTIVITY_AI_AUTO_MAX_SELLERS || "15")),
    50
  );

  const { globalReport, sellerReports } = await generateGlobalPlusTopSellers({
    period: automation.autoPeriod,
    anchor: now,
    managerId: null,
    trigger: ActivityReportTrigger.SCHEDULED,
    createdBy: null,
    maxSellers,
  });

  await prisma.activityReportAutomation.update({
    where: { id: "singleton" },
    data: { lastAutoRunAt: now },
  });

  return NextResponse.json({
    ok: true,
    globalReportId: globalReport.id,
    sellerReportCount: sellerReports.length,
    period: automation.autoPeriod,
  });
}
