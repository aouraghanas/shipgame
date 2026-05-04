import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { SupportTicketPriority, SupportTicketRecipient, SupportTicketSubject } from "@prisma/client";
import { canCreateTicket, canUseTicketsApp } from "@/lib/tickets-access";
import { buildTicketListWhere, type TicketListQuery } from "@/lib/tickets-list-where";
import { logAudit } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/mobile-auth";

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
    if (data.recipient === "SPECIFIC_USER" && !data.assigneeId?.trim()) {
      ctx.addIssue({ code: "custom", path: ["assigneeId"], message: "Assignee required for specific recipient." });
    }
    if (data.recipient !== "SPECIFIC_USER" && data.assigneeId) {
      ctx.addIssue({ code: "custom", path: ["assigneeId"], message: "Clear assignee unless recipient is Specific person." });
    }
  });

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !canUseTicketsApp(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const take = Math.min(Number(searchParams.get("take") || "80"), 200);

  const listQ: TicketListQuery = {
    includeArchived: searchParams.get("archived") === "1",
    status: searchParams.get("status"),
    priority: searchParams.get("priority"),
    createdById: searchParams.get("createdBy"),
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
  };

  const where = buildTicketListWhere(session, listQ);

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
  const session = await getSessionFromRequest(req);
  if (!session || !canCreateTicket(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const role = session.user.role;
  const sellerOptional = role === "SOURCING_AGENT" || role === "ACCOUNTANT";
  if (!sellerOptional && !d.sellerId?.trim() && !d.sellerNameText?.trim()) {
    return NextResponse.json(
      { error: "Provide a seller from the list or seller name/details." },
      { status: 400 }
    );
  }

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
