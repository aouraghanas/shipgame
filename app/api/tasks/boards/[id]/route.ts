import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  canAccessTasks,
  canManageBoardSettings,
  canSeeBoard,
} from "@/lib/tasks-access";

/**
 * GET /api/tasks/boards/[id]
 *
 * Returns the full kanban state for one board: columns (sorted by
 * position) with their tasks (also position-sorted), plus the board's
 * labels and member list.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessTasks(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const board = await prisma.taskBoard.findUnique({
    where: { id: params.id },
    include: {
      columns: { orderBy: { position: "asc" } },
      labels: { orderBy: { name: "asc" } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
        },
      },
    },
  });
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await canSeeBoard(session, board)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tasks = await prisma.task.findMany({
    where: { boardId: board.id, archived: false },
    orderBy: [{ columnId: "asc" }, { position: "asc" }],
    include: {
      reporter: { select: { id: true, name: true, avatarUrl: true } },
      assignees: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, role: true } },
        },
      },
      labels: {
        include: {
          label: { select: { id: true, name: true, color: true } },
        },
      },
      checklist: { orderBy: { position: "asc" } },
      _count: { select: { comments: true, checklist: true } },
    },
  });

  return NextResponse.json({
    id: board.id,
    key: board.key,
    name: board.name,
    description: board.description,
    color: board.color,
    icon: board.icon,
    visibility: board.visibility,
    columns: board.columns,
    labels: board.labels,
    members: board.members.map((m) => m.user),
    tasks: tasks.map((t) => ({
      id: t.id,
      boardId: t.boardId,
      columnId: t.columnId,
      title: t.title,
      description: t.description,
      priority: t.priority,
      position: t.position,
      dueAt: t.dueAt,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      archived: t.archived,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      reporter: t.reporter,
      assignees: t.assignees.map((a) => a.user),
      labels: t.labels.map((l) => l.label),
      checklistTotal: t._count.checklist,
      checklistDone: t.checklist.filter((c) => c.done).length,
      commentCount: t._count.comments,
    })),
  });
}

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(1000).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  icon: z.string().max(8).nullable().optional(),
  visibility: z.enum(["PUBLIC", "TEAM_ONLY", "PRIVATE"]).optional(),
  archived: z.boolean().optional(),
  memberIds: z.array(z.string()).optional(),
});

/** PATCH — admin-only board settings (name, members, visibility…). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !(await canManageBoardSettings(session)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const board = await prisma.taskBoard.findUnique({ where: { id: params.id } });
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    data.description = parsed.data.description;
  if (parsed.data.color !== undefined) data.color = parsed.data.color;
  if (parsed.data.icon !== undefined) data.icon = parsed.data.icon;
  if (parsed.data.visibility !== undefined)
    data.visibility = parsed.data.visibility;
  if (parsed.data.archived !== undefined) data.archived = parsed.data.archived;

  const updated = await prisma.$transaction(async (tx) => {
    const b = await tx.taskBoard.update({
      where: { id: board.id },
      data,
    });
    if (parsed.data.memberIds) {
      await tx.taskBoardMember.deleteMany({ where: { boardId: board.id } });
      if (parsed.data.memberIds.length > 0) {
        await tx.taskBoardMember.createMany({
          data: parsed.data.memberIds.map((userId) => ({
            boardId: board.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }
    }
    return b;
  });

  return NextResponse.json(updated);
}

/** DELETE — admin-only soft delete (mark archived). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !(await canManageBoardSettings(session)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.taskBoard.update({
    where: { id: params.id },
    data: { archived: true },
  });
  return NextResponse.json({ ok: true });
}
