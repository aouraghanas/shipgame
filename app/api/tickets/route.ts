import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  SupportTicketPriority,
  SupportTicketRecipient,
  SupportTicketSubject,
  SupportTicketStatus,
} from "@prisma/client";
import { canCreateTicket, canUseTicketsApp } from "@/lib/tickets-access";
import { logAudit } from "@/lib/audit";

const SUBJECTS = [
  "SOURCING",
  "PAYMENTS",
  "CALL_CENTER",
  "DELIVERY",
  "SHIPPING",
  "ORDERS",
  "PLATFORM",
  "WAREHOUSE",
  "PARTNER_LOGISTICS",
  "FINANCE",
  "PRODUCT_CATALOG",
  "TECH_SUPPORT",
  "ACCOUNTING",
  "OTHER",
] as const satisfies readonly SupportTicketSubject[];

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const satisfies readonly SupportTicketPriority[];

const RECIPIENTS = ["ALL_ADMINS", "SPECIFIC_USER", "SOURCING_TEAM"] as const satisfies readonly SupportTicketRecipient[];

const postSchema = z
  .object({
    sellerId: z.string().optional(),
    sellerNameText: z.string().max(300).optional(),
    subject: z.enum(SUBJECTS),
    priority: z.enum(PRIORITIES).default("NORMAL"),
    deadlineAt: z.string().datetime().optional().nullable(),
    title: z.string().min(2).max(200),
    description: z.string().min(10).max(20000),
    recipient: z.enum(RECIPIENTS),
    assigneeId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.sellerId?.trim() && !data.sellerNameText?.trim()) {
      ctx.addIssue({ code: "custom", message: "Provide a seller from the list or a seller name/details." });
    }
    if (data.recipient === "SPECIFIC_USER" && !data.assigneeId?.trim()) {
      ctx.addIssue({ code: "custom", path: ["assigneeId"], message: "Assignee required for specific recipient." });
    }
    if (data.recipient !== "SPECIFIC_USER" && data.assigneeId) {
      ctx.addIssue({ code: "custom", path: ["assigneeId"], message: "Clear assignee unless recipient is Specific person." });
    }
  });

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canUseTicketsApp(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("archived") === "1";
  const status = searchParams.get("status");
  const take = Math.min(Number(searchParams.get("take") || "80"), 200);

  const role = session.user.role;

  const parts: Prisma.SupportTicketWhereInput[] = [];
  if (!includeArchived) parts.push({ status: { not: "ARCHIVED" } });

  if (role === "MANAGER") {
    parts.push({
      OR: [{ createdById: session.user.id }, { assigneeId: session.user.id }],
    });
  }
  /** ADMIN + SOURCING_AGENT: full queue (sourcing workflow still limited per ticket). */

  if (status && ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "ARCHIVED"].includes(status)) {
    parts.push({ status: status as SupportTicketStatus });
  }

  const where: Prisma.SupportTicketWhereInput = parts.length ? { AND: parts } : {};

  const rows = await prisma.supportTicket.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
      _count: { select: { attachments: true, comments: true } },
    },
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canCreateTicket(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  let sellerId: string | null = d.sellerId?.trim() || null;
  if (sellerId) {
    const s = await prisma.seller.findUnique({ where: { id: sellerId } });
    if (!s) return NextResponse.json({ error: "Seller not found" }, { status: 400 });
  }

  if (d.recipient === "SPECIFIC_USER" && d.assigneeId) {
    const u = await prisma.user.findUnique({ where: { id: d.assigneeId } });
    if (!u || u.status !== "ACTIVE")
      return NextResponse.json({ error: "Assignee not found or inactive" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      createdById: session.user.id,
      sellerId,
      sellerNameText: d.sellerNameText?.trim() || null,
      subject: d.subject,
      priority: d.priority,
      deadlineAt: d.deadlineAt ? new Date(d.deadlineAt) : null,
      title: d.title.trim(),
      description: d.description.trim(),
      recipient: d.recipient,
      assigneeId: d.recipient === "SPECIFIC_USER" ? d.assigneeId! : null,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
    },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "supportTicket.create",
    `Ticket #${ticket.id.slice(0, 8)} — ${ticket.subject} / ${ticket.priority}`
  );

  return NextResponse.json(ticket, { status: 201 });
}
