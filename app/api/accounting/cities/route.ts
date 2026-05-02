import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canUseAccountingTools, isAccountingAdmin } from "@/lib/accounting-access";
import { logAudit } from "@/lib/audit";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "city";
}

const postSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  dexpressCostLyd: z.union([z.string(), z.number()]),
  sellToSellerLyd: z.union([z.string(), z.number()]),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canUseAccountingTools(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.accountingCityRate.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      dexpressCostLyd: r.dexpressCostLyd.toString(),
      sellToSellerLyd: r.sellToSellerLyd.toString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAccountingAdmin(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let slug = parsed.data.slug ?? slugify(parsed.data.name);
  const exists = await prisma.accountingCityRate.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;

  const row = await prisma.accountingCityRate.create({
    data: {
      name: parsed.data.name,
      slug,
      dexpressCostLyd: parsed.data.dexpressCostLyd,
      sellToSellerLyd: parsed.data.sellToSellerLyd,
      active: parsed.data.active ?? true,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });

  await logAudit(session.user.id, session.user.name, "accounting.city.create", `City rate ${row.name} (${slug})`);

  return NextResponse.json(
    {
      ...row,
      dexpressCostLyd: row.dexpressCostLyd.toString(),
      sellToSellerLyd: row.sellToSellerLyd.toString(),
    },
    { status: 201 }
  );
}
