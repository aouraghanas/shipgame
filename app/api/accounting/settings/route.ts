import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canUseAccountingTools, isAccountingAdmin } from "@/lib/accounting-access";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({
  codFeePercent: z.number().min(0).max(100).optional(),
  leadFeeUsd: z.number().min(0).max(999).optional(),
  transferFeePercentMin: z.number().min(0).max(100).optional(),
  transferFeePercentMax: z.number().min(0).max(100).optional(),
});

async function ensureSettings() {
  const existing = await prisma.accountingSettings.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return prisma.accountingSettings.create({
    data: { id: "singleton" },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canUseAccountingTools(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const s = await ensureSettings();
  return NextResponse.json({
    ...s,
    codFeePercent: s.codFeePercent.toString(),
    leadFeeUsd: s.leadFeeUsd.toString(),
    transferFeePercentMin: s.transferFeePercentMin.toString(),
    transferFeePercentMax: s.transferFeePercentMax.toString(),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAccountingAdmin(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await ensureSettings();
  const data: Record<string, unknown> = {};
  if (parsed.data.codFeePercent !== undefined) data.codFeePercent = parsed.data.codFeePercent;
  if (parsed.data.leadFeeUsd !== undefined) data.leadFeeUsd = parsed.data.leadFeeUsd;
  if (parsed.data.transferFeePercentMin !== undefined) data.transferFeePercentMin = parsed.data.transferFeePercentMin;
  if (parsed.data.transferFeePercentMax !== undefined) data.transferFeePercentMax = parsed.data.transferFeePercentMax;

  const s = await prisma.accountingSettings.update({
    where: { id: "singleton" },
    data,
  });

  await logAudit(session.user.id, session.user.name, "accounting.settings.patch", "Updated global accounting fee settings");

  return NextResponse.json({
    ...s,
    codFeePercent: s.codFeePercent.toString(),
    leadFeeUsd: s.leadFeeUsd.toString(),
    transferFeePercentMin: s.transferFeePercentMin.toString(),
    transferFeePercentMax: s.transferFeePercentMax.toString(),
  });
}
