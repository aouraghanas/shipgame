import { NextRequest, NextResponse } from "next/server";
import { canAccessAccounting, currencyScopeFor } from "@/lib/accounting-access";
import { buildAccountingSummary } from "@/lib/accounting-summary";
import { getSessionFromRequest } from "@/lib/mobile-auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !canAccessAccounting(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from and to (YYYY-MM-DD) required" }, { status: 400 });

  const fromD = new Date(from);
  const toD = new Date(to + "T23:59:59.999Z");
  if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime()))
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const scope = currencyScopeFor(session);
  const summary = await buildAccountingSummary(fromD, toD, scope ? { currency: scope } : undefined);
  return NextResponse.json(summary);
}
