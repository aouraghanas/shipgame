import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notificationDismissal.upsert({
    where: { notificationId_userId: { notificationId: params.id, userId: session.user.id } },
    create: { notificationId: params.id, userId: session.user.id },
    update: {},
  });

  await prisma.notification.update({
    where: { id: params.id },
    data: { dismissCount: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
