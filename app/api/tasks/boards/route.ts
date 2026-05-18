import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  canAccessTasks,
  canSeeBoard,
  isTaskAdmin,
} from "@/lib/tasks-access";
import { ensureDefaultBoards } from "@/lib/task-seed";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/tasks/boards
 *
 * Returns the list of boards visible to the caller. Lazy-seeds the
 * defaults on first hit so a fresh database produces a usable
 * workspace without manual setup.
 */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessTasks(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await ensureDefaultBoards();

  const userId = session.user?.id;
  const admin = isTaskAdmin(session);

  const boards = await prisma.taskBoard.findMany({
    where: { archived: false },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      members: { select: { userId: true } },
      _count: { select: { tasks: { where: { archived: false } } } },
    },
  });

  const visible = admin
    ? boards
    : boards.filter((b) => {
        if (b.visibility === "PUBLIC") return true;
        if (b.visibility === "PRIVATE") return false;
        return b.members.some((m) => m.userId === userId);
      });

  return NextResponse.json(
    visible.map((b) => ({
      id: b.id,
      key: b.key,
      name: b.name,
      description: b.description,
      color: b.color,
      icon: b.icon,
      visibility: b.visibility,
      sortOrder: b.sortOrder,
      taskCount: b._count.tasks,
      memberIds: b.members.map((m) => m.userId),
    }))
  );
}

const postSchema = z.object({
  name: z.string().min(1).max(80),
  key: z.string().min(1).max(20).regex(/^[A-Za-z0-9_-]+$/).optional(),
  description: z.string().max(1000).optional(),
  color: z.string().max(20).optional(),
  icon: z.string().max(16).optional(),
  visibility: z.enum(["PUBLIC", "TEAM_ONLY", "PRIVATE"]).default("PUBLIC"),
  /**
   * Initial member list (relevant when visibility = TEAM_ONLY). Admins
   * are implicit owners, so they don't need to be in this list.
   */
  memberIds: z.array(z.string()).optional(),
});

/** POST /api/tasks/boards — admin-only, creates a board with default columns. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isTaskAdmin(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const key =
    parsed.data.key ??
    (parsed.data.name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 20) ||
      `BOARD_${Date.now()}`);

  const maxSort = await prisma.taskBoard.aggregate({
    _max: { sortOrder: true },
  });

  const memberIds = Array.from(
    new Set((parsed.data.memberIds ?? []).filter(Boolean))
  );

  try {
    const board = await prisma.taskBoard.create({
      data: {
        key,
        name: parsed.data.name,
        description: parsed.data.description,
        color: parsed.data.color,
        icon: parsed.data.icon,
        visibility: parsed.data.visibility,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        columns: {
          createMany: {
            data: [
              { name: "Backlog", color: "#475569", position: 0 },
              { name: "To do", color: "#64748b", position: 1 },
              { name: "In progress", color: "#3b82f6", position: 2 },
              { name: "In review", color: "#a855f7", position: 3 },
              { name: "Done", color: "#10b981", position: 4, isDone: true },
            ],
          },
        },
        members: memberIds.length
          ? {
              createMany: {
                data: memberIds.map((userId) => ({ userId })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
    });

    if (session.user?.id) {
      await logAudit(
        session.user.id,
        session.user.name ?? "",
        "tasks.board.create",
        `Created board ${board.name} (${board.key})`
      );
    }

    void canSeeBoard;
    return NextResponse.json(board, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create board: ${msg}` },
      { status: 500 }
    );
  }
}
