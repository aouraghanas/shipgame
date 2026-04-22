"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/shared/Avatar";
import { Badge } from "@/components/ui/badge";
import { getCurrentMonthKey, formatMonthKey } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { UserWithStats } from "@/types";

type StockEntry = { id: string; quantity: number; sellerName: string | null; createdAt: string };

export default function PerformancePage() {
  const monthKey = getCurrentMonthKey();
  const [managers, setManagers] = useState<UserWithStats[]>([]);
  const [selected, setSelected] = useState<UserWithStats | null>(null);
  const [deliveredTotal, setDeliveredTotal] = useState(0);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [newQty, setNewQty] = useState("");
  const [newSeller, setNewSeller] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((users: UserWithStats[]) => setManagers(users.filter((u) => u.role === "MANAGER")))
      .finally(() => setLoading(false));
  }, []);

  async function openManager(mgr: UserWithStats) {
    setSelected(mgr);
    setOpen(true);
    const [perfRes, stockRes] = await Promise.all([
      fetch(`/api/performance/${mgr.id}?month=${monthKey}`),
      fetch(`/api/stock?userId=${mgr.id}&month=${monthKey}`),
    ]);
    // Performance endpoint for admin GET is via leaderboard, use delivered entry directly
    // Use stock entries directly
    const perf = await fetch(`/api/leaderboard?month=${monthKey}`).then((r) => r.json());
    const entry = perf.entries?.find((e: { userId: string; deliveredTotal: number }) => e.userId === mgr.id);
    setDeliveredTotal(entry?.deliveredTotal ?? 0);
    setStockEntries(await stockRes.json());
    void perfRes; // suppress unused warning
  }

  async function saveDelivered() {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/performance/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total: deliveredTotal, monthKey }),
    });
    setSaving(false);
  }

  async function addStock() {
    if (!selected || !newQty) return;
    const res = await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selected.id, quantity: Number(newQty), sellerName: newSeller || null, monthKey }),
    });
    const entry = await res.json();
    setStockEntries((prev) => [entry, ...prev]);
    setNewQty(""); setNewSeller("");
  }

  async function deleteStock(id: string) {
    await fetch(`/api/stock/${id}`, { method: "DELETE" });
    setStockEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Edit Performance</h1>
        <p className="text-zinc-400 mt-1">{formatMonthKey(monthKey)}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {managers.map((m) => (
            <div key={m.id} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
              <div className="flex-1">
                <p className="font-semibold text-zinc-100">{m.name}</p>
                <p className="text-sm text-zinc-400">{m.email}</p>
              </div>
              <Badge variant={m.status === "ACTIVE" ? "default" : "outline"}>{m.status}</Badge>
              <Button size="sm" variant="outline" onClick={() => openManager(m)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name} — {formatMonthKey(monthKey)}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-2">
            {/* Delivered */}
            <Card>
              <CardHeader><CardTitle className="text-base">Delivered Orders (Month Total)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input type="number" min={0} value={deliveredTotal} onChange={(e) => setDeliveredTotal(Number(e.target.value))} />
                  <Button onClick={saveDelivered} disabled={saving} size="sm">{saving ? "..." : "Save"}</Button>
                </div>
              </CardContent>
            </Card>

            {/* Stock */}
            <Card>
              <CardHeader><CardTitle className="text-base">Stock Entries</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input type="number" min={1} placeholder="Qty" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="w-24" />
                  <Input placeholder="Seller (optional)" value={newSeller} onChange={(e) => setNewSeller(e.target.value)} />
                  <Button size="icon" onClick={addStock}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {stockEntries.length === 0 && <p className="text-sm text-zinc-500 text-center py-4">No entries</p>}
                  {stockEntries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg bg-zinc-800 px-3 py-2 text-sm">
                      <span className="font-semibold text-zinc-100">×{e.quantity}</span>
                      <span className="text-zinc-400">{e.sellerName ?? "—"}</span>
                      <button onClick={() => deleteStock(e.id)} className="text-red-400 hover:text-red-300 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
