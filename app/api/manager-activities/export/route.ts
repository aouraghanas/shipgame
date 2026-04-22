import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const managerId = searchParams.get("managerId");
  const sellerId = searchParams.get("sellerId");
  const keyword = searchParams.get("keyword");

  const where: Prisma.ManagerActivityWhereInput = {};
  if (managerId) where.managerId = managerId;
  if (sellerId) where.sellerId = sellerId;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }
  if (keyword) where.description = { contains: keyword, mode: "insensitive" };

  const activities = await prisma.managerActivity.findMany({
    where,
    include: {
      manager: { select: { name: true } },
      seller: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;

  const header = "Manager,Seller,Seller Email,Category,Description,Date,Time,Attachments";
  const rows = activities.map((a) =>
    [
      esc(a.manager.name),
      esc(a.seller.name),
      esc(a.seller.email ?? ""),
      a.category,
      esc(a.description),
      new Date(a.createdAt).toLocaleDateString("en-US"),
      new Date(a.createdAt).toLocaleTimeString("en-US"),
      esc(a.attachments.join(" | ")),
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");
  const filename = `activity-report-${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
