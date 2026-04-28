import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canCommentOnTicket, canUseTicketsApp } from "@/lib/tickets-access";
import { logAudit } from "@/lib/audit";

const postSchema = z.object({
  body: z.string().min(1).max(10000),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canUseTicketsApp(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canCommentOnTicket(session, ticket)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json();
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.supportTicketComment.create({
    data: {
      ticketId: params.id,
      userId: session.user.id,
      body: parsed.data.body.trim(),
    },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  await prisma.supportTicket.update({
    where: { id: params.id },
    data: { updatedAt: new Date() },
  });

  await logAudit(session.user.id, session.user.name, "supportTicket.comment", `Ticket ${params.id}`);

  return NextResponse.json(row, { status: 201 });
}
