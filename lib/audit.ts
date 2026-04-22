import { prisma } from "@/lib/prisma";

export async function logAudit(
  userId: string,
  userName: string,
  action: string,
  details: string
) {
  await prisma.auditLog.create({
    data: { userId, userName, action, details },
  });
}
