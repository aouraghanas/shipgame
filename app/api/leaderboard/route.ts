import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deliveredScore,
  totalStockScore,
  totalStockQuantity,
  rankManagers,
  type RankedManager,
} from "@/lib/scoring";
import { getCurrentMonthKey } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const monthKey = searchParams.get("month") || getCurrentMonthKey();

  // Get all active managers
  const users = await prisma.user.findMany({
    where: { role: "MANAGER", status: "ACTIVE" },
    include: {
      deliveredEntries: { where: { monthKey } },
      stockEntries: { where: { monthKey } },
      notes: { where: { monthKey, visible: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Build ranked managers
  const managers: RankedManager[] = users.map((u) => {
    const deliveredTotal = u.deliveredEntries[0]?.total ?? 0;
    const stockEntries = u.stockEntries;
    const stockQty = totalStockQuantity(stockEntries);
    const stockScore = totalStockScore(stockEntries);
    const dScore = deliveredScore(deliveredTotal);
    const total = dScore + stockScore;

    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      deliveredTotal,
      stockQty,
      stockScore,
      deliveredScoreVal: dScore,
      totalScoreVal: total,
      note: u.notes[0]?.content ?? null,
      createdAt: u.createdAt,
    };
  });

  const ranked = rankManagers(managers);

  // Get month config
  const config = await prisma.monthConfig.findUnique({ where: { monthKey } });

  const entries = ranked.map((m, i) => ({ rank: i + 1, ...m }));

  return NextResponse.json({
    monthKey,
    entries,
    rewardText: config?.rewardText ?? null,
    punishmentText: config?.punishmentText ?? null,
  });
}
