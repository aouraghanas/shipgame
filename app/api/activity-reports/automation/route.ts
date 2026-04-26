import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import type { FeedbackReportPeriod } from "@prisma/client";

const PERIOD_VALUES = ["DAILY", "WEEKLY", "MONTHLY"] as const;

async function getOrCreateSettings() {
  return prisma.activityReportAutomation.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", autoEnabled: false, autoPeriod: "DAILY" },
    update: {},
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const row = await getOrCreateSettings();
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const schema = z.object({
    autoEnabled: z.boolean().optional(),
    autoPeriod: z.enum(PERIOD_VALUES).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.activityReportAutomation.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      autoEnabled: parsed.data.autoEnabled ?? false,
      autoPeriod: (parsed.data.autoPeriod ?? "DAILY") as FeedbackReportPeriod,
    },
    update: {
      ...(parsed.data.autoEnabled !== undefined ? { autoEnabled: parsed.data.autoEnabled } : {}),
      ...(parsed.data.autoPeriod ? { autoPeriod: parsed.data.autoPeriod as FeedbackReportPeriod } : {}),
    },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "activityReport.automation.update",
    `Activity AI automation: enabled=${row.autoEnabled}, period=${row.autoPeriod}`
  );

  return NextResponse.json(row);
}
