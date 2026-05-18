import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canAccessTasks, canEditBoard } from "@/lib/tasks-access";

const postSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().max(20).optional(),
});

/** POST — create a label on a board. Anyone who can edit the board can. */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessTasks(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const board = await prisma.taskBoard.findUnique({ where: { id: params.id } });
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canEditBoard(session, board)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const label = await prisma.taskLabel.create({
      data: {
        boardId: board.id,
        name: parsed.data.name.trim(),
        color: parsed.data.color ?? "#64748b",
      },
    });
    return NextResponse.json(label, { status: 201 });
  } catch (e) {
    // Unique violation on (boardId, name).
    if (e instanceof Error && /Unique/.test(e.message)) {
      return NextResponse.json(
        { error: "A label with that name already exists." },
        { status: 409 }
      );
    }
    throw e;
  }
}
