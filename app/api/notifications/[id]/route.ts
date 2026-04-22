import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const notification = await prisma.notification.findUnique({
    where: { id: params.id },
  });

  if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(notification);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title, content, type, bgColor, textColor, icon,
    ctaText, ctaUrl, ctaNewTab, isActive, isDraft, isDismissible,
    frequency, targetRoles, displayPages, priority, startAt, endAt,
  } = body;

  const notification = await prisma.notification.update({
    where: { id: params.id },
    data: {
      title,
      content,
      type: type || "INFO",
      bgColor: bgColor || null,
      textColor: textColor || null,
      icon: icon || null,
      ctaText: ctaText || null,
      ctaUrl: ctaUrl || null,
      ctaNewTab: ctaNewTab ?? true,
      isActive: isActive ?? false,
      isDraft: isDraft ?? true,
      isDismissible: isDismissible ?? true,
      frequency: frequency || "ALWAYS",
      targetRoles: targetRoles || [],
      displayPages: displayPages || ["leaderboard"],
      priority: priority ?? 0,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
    },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "notification.update",
    `Updated notification "${title}"`
  );

  return NextResponse.json(notification);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const notification = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.notification.delete({ where: { id: params.id } });

  await logAudit(
    session.user.id,
    session.user.name,
    "notification.delete",
    `Deleted notification "${notification.title}"`
  );

  return NextResponse.json({ ok: true });
}
