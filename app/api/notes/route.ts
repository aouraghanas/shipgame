import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthKey } from "@/lib/utils";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  userId: z.string(),
  content: z.string().min(1),
  visible: z.boolean().optional(),
  monthKey: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const monthKey = searchParams.get("month") || getCurrentMonthKey();

  const notes = await prisma.note.findMany({
    where: { monthKey },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const monthKey = parsed.data.monthKey || getCurrentMonthKey();

  const note = await prisma.note.upsert({
    where: { userId_monthKey: { userId: parsed.data.userId, monthKey } },
    create: {
      userId: parsed.data.userId,
      monthKey,
      content: parsed.data.content,
      visible: parsed.data.visible ?? true,
    },
    update: {
      content: parsed.data.content,
      visible: parsed.data.visible ?? true,
    },
  });

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { name: true } });
  await logAudit(
    session.user.id,
    session.user.name,
    "note.upsert",
    `Set note for ${user?.name ?? parsed.data.userId} (${monthKey})`
  );

  return NextResponse.json(note);
}
