"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getCurrentMonthKey, formatMonthKey } from "@/lib/utils";
import { stockEntryPoints } from "@/lib/scoring";
import { Plus, Trash2, TrendingUp, Package, Trophy } from "lucide-react";

type StockEntry = { id: string; quantity: number; sellerName: string | null; createdAt: string };

export default function DashboardPage() {
  const { data: session } = useSession();
  const monthKey = getCurrentMonthKey();

  const [deliveredTotal, setDeliveredTotal] = useState(0);
  const [editDelivered, setEditDelivered] = useState("");
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [newQty, setNewQty] = useState("");
  const [newSeller, setNewSeller] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingStock, setLoadingStock] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!session) return;
    // Load delivered total via leaderboard
    fetch(`/api/leaderboard?month=${monthKey}`)
      .then((r) => r.json())
      .then((d) => {
        const me = d.entries?.find((e: { userId: string; deliveredTotal: number }) => e.userId === session.user.id);
        const total = me?.deliveredTotal ?? 0;
        setDeliveredTotal(total);
        setEditDelivered(String(total));
      });

    fetch(`/api/stock?month=${monthKey}`)
      .then((r) => r.json())
      .then(setStockEntries)
      .finally(() => setLoadingStock(false));
  }, [session, monthKey]);

  async function saveDelivered(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total: Number(editDelivered), monthKey }),
    });
    if (res.ok) { setDeliveredTotal(Number(editDelivered)); setSuccessMsg("Delivered orders updated!"); setTimeout(() => setSuccessMsg(""), 3000); }
    setSaving(false);
  }

  async function addStock(e: React.FormEvent) {
    e.preventDefault();
    if (!newQty || Number(newQty) < 1) return;
    const res = await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: Number(newQty), sellerName: newSeller || null, monthKey }),
    });
    const entry = await res.json();
    setStockEntries((prev) => [entry, ...prev]);
    setNewQty(""); setNewSeller("");
    setSuccessMsg("Stock entry added!"); setTimeout(() => setSuccessMsg(""), 3000);
  }

  const stockQty = stockEntries.reduce((s, e) => s + e.quantity, 0);
  const stockScore = stockEntries.reduce((s, e) => s + stockEntryPoints(e.quantity), 0);
  const dScore = deliveredTotal / 100;
  const total = dScore + stockScore;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Dashboard</h1>
        <p className="text-zinc-400 mt-1">{formatMonthKey(monthKey)}</p>
      </div>

      {/* Score summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Delivered Orders", value: deliveredTotal, icon: TrendingUp, color: "text-indigo-400" },
          { label: "Stock Entries", value: stockEntries.length, icon: Package, color: "text-emerald-400" },
          { label: "Total Stock Qty", value: stockQty, icon: Package, color: "text-purple-400" },
          { label: "Total Score", value: total.toFixed(1), icon: Trophy, color: "text-amber-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400">{s.label}</CardTitle></CardHeader>
            <CardContent><div className={`text-3xl font-bold ${s.color}`}>{s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      {successMsg && <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-emerald-400 text-sm">{successMsg}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Update delivered */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-indigo-400" /> Delivered Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400 mb-4">Enter your total delivered orders from the start of this month until today. This replaces your previous value.</p>
            <form onSubmit={saveDelivered} className="space-y-3">
              <div className="space-y-2">
                <Label>Month-to-date total</Label>
                <Input type="number" min={0} value={editDelivered} onChange={(e) => setEditDelivered(e.target.value)} required />
              </div>
              <Button type="submit" disabled={saving} className="w-full">{saving ? "Saving..." : "Update Total"}</Button>
            </form>
            <p className="text-xs text-zinc-500 mt-3">Score: {dScore.toFixed(2)} points ({deliveredTotal} ÷ 100)</p>
          </CardContent>
        </Card>

        {/* Add stock entry */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-emerald-400" /> Add Stock Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400 mb-4">Add stock orders one by one. Each entry is permanent after submission.</p>
            <form onSubmit={addStock} className="space-y-3">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min={1} value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="e.g. 150" required />
                <p className="text-xs text-zinc-500">Points: {newQty ? stockEntryPoints(Number(newQty)) : "—"} ({Number(newQty) >= 200 ? "200+" : Number(newQty) >= 100 ? "100–199" : "1–99"} range)</p>
              </div>
              <div className="space-y-2">
                <Label>Seller name (optional)</Label>
                <Input value={newSeller} onChange={(e) => setNewSeller(e.target.value)} placeholder="e.g. Ahmed" />
              </div>
              <Button type="submit" className="w-full gap-2"><Plus className="h-4 w-4" /> Add Entry</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Stock entries list */}
      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">This Month&apos;s Stock Entries</CardTitle></CardHeader>
        <CardContent>
          {loadingStock ? (
            <div className="flex justify-center py-8"><div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : stockEntries.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">No stock entries yet this month.</p>
          ) : (
            <div className="space-y-2">
              {stockEntries.map((e) => (
                <div key={e.id} className="flex items-center gap-4 rounded-lg bg-zinc-800/50 px-4 py-2.5">
                  <div className="flex-1">
                    <span className="font-semibold text-zinc-100">×{e.quantity}</span>
                    {e.sellerName && <span className="text-zinc-400 text-sm ml-2">— {e.sellerName}</span>}
                  </div>
                  <Badge variant="secondary">{stockEntryPoints(e.quantity)} pt{stockEntryPoints(e.quantity) !== 1 ? "s" : ""}</Badge>
                  <span className="text-xs text-zinc-500">{new Date(e.createdAt).toLocaleDateString()}</span>
                  <span title="Contact admin to delete"><Trash2 className="h-3.5 w-3.5 text-zinc-600" /></span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
