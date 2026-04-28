import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canUseTicketsApp, canViewTicket } from "@/lib/tickets-access";
import { logAudit } from "@/lib/audit";

const postSchema = z.object({
  url: z.string().url(),
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  size: z.number().int().min(1).max(20 * 1024 * 1024),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canUseTicketsApp(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewTicket(session, ticket)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json();
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await prisma.supportTicketAttachment.create({
    data: {
      ticketId: params.id,
      url: parsed.data.url,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      size: parsed.data.size,
      uploadedById: session.user.id,
    },
  });

  await prisma.supportTicket.update({
    where: { id: params.id },
    data: { updatedAt: new Date() },
  });

  await logAudit(session.user.id, session.user.name, "supportTicket.attachment", `Ticket ${params.id}`);

  return NextResponse.json(row, { status: 201 });
}
