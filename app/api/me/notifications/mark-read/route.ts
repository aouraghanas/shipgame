import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/mobile-auth";

const schema = z.object({
  ids: z.array(z.string().min(1)).max(200).optional(),
  all: z.boolean().optional(),
});

/**
 * Mark notifications as read.
 *
 * Body:
 *   { ids: string[] }    → mark just these
 *   { all: true }        → mark every unread one for the current user
 */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const now = new Date();
  if (parsed.data.all) {
    const r = await prisma.userNotification.updateMany({
      where: { userId: session.user.id, readAt: null },
      data: { readAt: now },
    });
    // Mirror read state to campaign recipients for analytics.
    await prisma.campaignRecipient
      .updateMany({
        where: { userId: session.user.id, readAt: null },
        data: { readAt: now },
      })
      .catch(() => {});
    return NextResponse.json({ updated: r.count });
  }

  if (!parsed.data.ids?.length) {
    return NextResponse.json({ updated: 0 });
  }

  const r = await prisma.userNotification.updateMany({
    where: {
      userId: session.user.id,
      id: { in: parsed.data.ids },
      readAt: null,
    },
    data: { readAt: now },
  });

  // Mirror read state to campaign recipients linked to these notifications.
  await prisma.campaignRecipient
    .updateMany({
      where: {
        userId: session.user.id,
        readAt: null,
        userNotificationId: { in: parsed.data.ids },
      },
      data: { readAt: now },
    })
    .catch(() => {});

  return NextResponse.json({ updated: r.count });
}
