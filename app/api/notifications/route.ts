import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const notifications = await prisma.notification.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { dismissals: true } } },
  });

  return NextResponse.json(notifications);
}

export async function POST(req: Request) {
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

  const notification = await prisma.notification.create({
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
      createdBy: session.user.id,
    },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "notification.create",
    `Created notification "${title}"`
  );

  return NextResponse.json(notification, { status: 201 });
}
