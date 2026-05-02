import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canUseAccountingTools } from "@/lib/accounting-access";
import { buildAccountingSummary } from "@/lib/accounting-summary";
import { analyzeAccountingWithAI } from "@/lib/accounting-ai";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canUseAccountingTools(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const fromD = new Date(parsed.data.from);
  const toD = new Date(parsed.data.to + "T23:59:59.999Z");

  const summary = await buildAccountingSummary(fromD, toD);
  const settings = await prisma.accountingSettings.findUnique({ where: { id: "singleton" } });
  const cities = await prisma.accountingCityRate.findMany({ where: { active: true } });
  const fx = await prisma.accountingExchangeRate.findMany({ orderBy: { dateKey: "desc" }, take: 14 });

  const payload = {
    period: { from: parsed.data.from, to: parsed.data.to },
    settings: settings
      ? {
          codFeePercent: settings.codFeePercent.toString(),
          leadFeeUsd: settings.leadFeeUsd.toString(),
          transferFeePercentMin: settings.transferFeePercentMin.toString(),
          transferFeePercentMax: settings.transferFeePercentMax.toString(),
        }
      : null,
    cities: cities.map((c) => ({
      name: c.name,
      dexpressCostLyd: c.dexpressCostLyd.toString(),
      sellToSellerLyd: c.sellToSellerLyd.toString(),
      marginPerUnitLyd: c.sellToSellerLyd.minus(c.dexpressCostLyd).toString(),
    })),
    recentFx: fx.map((r) => ({ dateKey: r.dateKey, lydPerUsd: r.lydPerUsd.toString() })),
    ledgerRollup: summary,
  };

  const ai = await analyzeAccountingWithAI({
    fromIso: fromD.toISOString(),
    toIso: toD.toISOString(),
    summaryJson: JSON.stringify(payload),
  });

  const saved = await prisma.accountingAiReport.create({
    data: {
      fromDate: fromD,
      toDate: toD,
      summary: ai.summary,
      recommendations: ai.recommendations,
      insights: (ai.insights ?? {}) as object,
      model: ai.model,
      createdBy: session.user.id,
    },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "accounting.aiReport",
    `AI accounting report ${parsed.data.from} → ${parsed.data.to}`
  );

  return NextResponse.json({
    id: saved.id,
    generatedAt: saved.generatedAt,
    summary: ai.summary,
    recommendations: ai.recommendations,
    insights: ai.insights,
    model: ai.model,
  });
}
