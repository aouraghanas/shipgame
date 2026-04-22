import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthKey } from "@/lib/utils";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  total: z.number().int().nonnegative(),
  monthKey: z.string().optional(),
});

// Admin: update delivered total for any user
export async function PUT(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const monthKey = parsed.data.monthKey || getCurrentMonthKey();
  const userId = params.userId;

  const entry = await prisma.deliveredEntry.upsert({
    where: { userId_monthKey: { userId, monthKey } },
    create: { userId, monthKey, total: parsed.data.total },
    update: { total: parsed.data.total },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await logAudit(
    session.user.id,
    session.user.name,
    "performance.update",
    `Set delivered total to ${parsed.data.total} for ${user?.name ?? userId} (${monthKey})`
  );

  return NextResponse.json(entry);
}
