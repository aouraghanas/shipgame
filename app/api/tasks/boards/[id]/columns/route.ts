import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canManageBoardSettings } from "@/lib/tasks-access";

const postSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().max(20).optional(),
  isDone: z.boolean().optional(),
});

/** POST /api/tasks/boards/[id]/columns — admin creates a new status column. */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !(await canManageBoardSettings(session)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const max = await prisma.taskColumn.aggregate({
    where: { boardId: params.id },
    _max: { position: true },
  });

  const col = await prisma.taskColumn.create({
    data: {
      boardId: params.id,
      name: parsed.data.name,
      color: parsed.data.color,
      isDone: !!parsed.data.isDone,
      position: (max._max.position ?? -1) + 1,
    },
  });

  return NextResponse.json(col, { status: 201 });
}
