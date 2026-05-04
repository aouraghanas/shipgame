import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { SupportTicketStatus } from "@prisma/client";
import { canEditTicketMeta, canManageTicketWorkflow, canUseTicketsApp, canViewTicket } from "@/lib/tickets-access";
import { logAudit } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/mobile-auth";

const patchSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "ARCHIVED"]).optional(),
  assigneeId: z.string().nullable().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  deadlineAt: z.string().datetime().nullable().optional(),
  resolutionNote: z.string().max(10000).optional().nullable(),
});

async function loadTicket(id: string) {
  return prisma.supportTicket.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      assignee: { select: { id: true, name: true, email: true, role: true } },
      seller: { select: { id: true, name: true, email: true } },
      attachments: { orderBy: { createdAt: "asc" } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, role: true } } },
      },
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !canUseTicketsApp(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ticket = await loadTicket(params.id);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewTicket(session, ticket)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(ticket);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !canUseTicketsApp(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewTicket(session, ticket)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const updates: Record<string, unknown> = {};

  const workflowPatch =
    d.status !== undefined || d.assigneeId !== undefined || d.resolutionNote !== undefined;
  const metaPatch = d.priority !== undefined || d.deadlineAt !== undefined;

  if (workflowPatch) {
    if (!canManageTicketWorkflow(session, ticket))
      return NextResponse.json(
        { error: "Only admins, sourcing handlers, or accounting handlers can update workflow fields" },
        { status: 403 }
      );
    if (d.status !== undefined) {
      updates.status = d.status as SupportTicketStatus;
      if (d.status === "RESOLVED") updates.resolvedAt = new Date();
      if (d.status === "ARCHIVED") updates.archivedAt = new Date();
    }
    if (d.assigneeId !== undefined) {
      if (d.assigneeId) {
        const u = await prisma.user.findUnique({ where: { id: d.assigneeId } });
        if (!u || u.status !== "ACTIVE") return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
      }
      updates.assigneeId = d.assigneeId;
    }
    if (d.resolutionNote !== undefined) updates.resolutionNote = d.resolutionNote?.trim() || null;
  }

  if (metaPatch) {
    if (!canEditTicketMeta(session, ticket)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (d.priority !== undefined) updates.priority = d.priority;
    if (d.deadlineAt !== undefined) updates.deadlineAt = d.deadlineAt ? new Date(d.deadlineAt) : null;
  }

  const next = await prisma.supportTicket.update({
    where: { id: params.id },
    data: updates,
    include: {
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      assignee: { select: { id: true, name: true, email: true, role: true } },
      seller: { select: { id: true, name: true, email: true } },
      attachments: true,
      comments: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  await logAudit(session.user.id, session.user.name, "supportTicket.patch", `Ticket ${params.id}`);

  return NextResponse.json(next);
}
