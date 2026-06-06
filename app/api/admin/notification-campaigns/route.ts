import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { Role, CampaignAudience } from "@prisma/client";

function isAdmin(role?: string) {
  return role === "ADMIN";
}

/**
 * GET — list past manual campaigns with simple analytics
 * (recipients, push sent, how many read).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const campaigns = await prisma.notificationCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { recipients: true } },
    },
  });

  // Read counts per campaign in one grouped query.
  const readGroups = await prisma.campaignRecipient.groupBy({
    by: ["campaignId"],
    where: { readAt: { not: null } },
    _count: { _all: true },
  });
  const readMap = new Map(readGroups.map((g) => [g.campaignId, g._count._all]));

  return NextResponse.json(
    campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      body: c.body,
      link: c.link,
      audience: c.audience,
      targetRoles: c.targetRoles,
      createdBy: c.createdBy,
      createdAt: c.createdAt,
      recipientCount: c._count.recipients,
      pushSentCount: c.pushSentCount,
      readCount: readMap.get(c.id) ?? 0,
    }))
  );
}

const postSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  link: z.string().max(500).optional(),
  audience: z.nativeEnum(CampaignAudience),
  targetRoles: z.array(z.nativeEnum(Role)).optional(),
  userIds: z.array(z.string()).optional(),
});

/**
 * POST — compose and send a manual notification campaign.
 *
 * Resolves the recipient set from the chosen audience, writes one inbox
 * notification per recipient (kind ANNOUNCEMENT), records CampaignRecipient
 * rows for analytics, then fires push to all of them.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { title, audience, targetRoles, userIds } = parsed.data;
  const link = parsed.data.link?.trim() || null;
  const text = parsed.data.body?.trim() || null;

  // Resolve recipients.
  let recipientIds: string[] = [];
  if (audience === "ALL") {
    const rows = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    recipientIds = rows.map((r) => r.id);
  } else if (audience === "ROLES") {
    if (!targetRoles?.length)
      return NextResponse.json({ error: "Pick at least one role." }, { status: 400 });
    const rows = await prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: targetRoles } },
      select: { id: true },
    });
    recipientIds = rows.map((r) => r.id);
  } else {
    if (!userIds?.length)
      return NextResponse.json({ error: "Pick at least one user." }, { status: 400 });
    const rows = await prisma.user.findMany({
      where: { status: "ACTIVE", id: { in: userIds } },
      select: { id: true },
    });
    recipientIds = rows.map((r) => r.id);
  }

  recipientIds = Array.from(new Set(recipientIds.filter(Boolean)));
  if (recipientIds.length === 0)
    return NextResponse.json({ error: "No matching recipients." }, { status: 400 });

  // Push first so we can record how many were accepted.
  const pushSent = await sendPushToUsers(recipientIds, {
    title,
    body: text,
    data: { kind: "ANNOUNCEMENT", link },
  }).catch(() => 0);

  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.notificationCampaign.create({
      data: {
        title,
        body: text,
        link,
        audience,
        targetRoles: audience === "ROLES" ? (targetRoles ?? []) : [],
        createdById: session.user.id,
        recipientCount: recipientIds.length,
        pushSentCount: pushSent,
      },
    });

    // Inbox rows.
    await tx.userNotification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        kind: "ANNOUNCEMENT" as const,
        title,
        body: text,
        link,
        campaignId: created.id,
      })),
    });

    // Pull back the freshly created inbox rows so we can pair them with
    // campaign-recipient rows (for per-user read analytics).
    const notes = await tx.userNotification.findMany({
      where: { campaignId: created.id },
      select: { id: true, userId: true },
    });
    const noteByUser = new Map(notes.map((n) => [n.userId, n.id]));

    await tx.campaignRecipient.createMany({
      data: recipientIds.map((userId) => ({
        campaignId: created.id,
        userId,
        userNotificationId: noteByUser.get(userId) ?? null,
        pushed: true,
      })),
    });

    return created;
  });

  await logAudit(
    session.user.id,
    session.user.name ?? "",
    "notification.campaign.send",
    `Sent "${title}" to ${recipientIds.length} users (${audience})`
  );

  return NextResponse.json({
    id: campaign.id,
    recipientCount: recipientIds.length,
    pushSentCount: pushSent,
  });
}
