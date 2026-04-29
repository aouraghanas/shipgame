"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrentMonthKey, formatMonthKey } from "@/lib/utils";
import { Trophy, AlertTriangle, Calculator } from "lucide-react";

type FormState = {
  winnerPlaces: number;
  loserPlaces: number;
  rewardText1: string;
  rewardText2: string;
  rewardText3: string;
  punishmentText1: string;
  punishmentText2: string;
  deliveredDivisor: string;
  stockBoundaryMid: string;
  stockBoundaryHigh: string;
  stockPointsLow: string;
  stockPointsMid: string;
  stockPointsHigh: string;
};

const defaultForm = (): FormState => ({
  winnerPlaces: 3,
  loserPlaces: 1,
  rewardText1: "",
  rewardText2: "",
  rewardText3: "",
  punishmentText1: "",
  punishmentText2: "",
  deliveredDivisor: "100",
  stockBoundaryMid: "100",
  stockBoundaryHigh: "200",
  stockPointsLow: "1",
  stockPointsMid: "2",
  stockPointsHigh: "3",
});

export default function RewardsPage() {
  const monthKey = getCurrentMonthKey();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/rewards?month=${monthKey}`)
      .then((r) => r.json())
      .then((d) => {
        const div =
          d.deliveredDivisor != null
            ? String(typeof d.deliveredDivisor === "object" && d.deliveredDivisor !== null && "toString" in d.deliveredDivisor
                ? (d.deliveredDivisor as { toString: () => string }).toString()
                : d.deliveredDivisor)
            : "100";
        setForm({
          winnerPlaces: d.winnerPlaces ?? 3,
          loserPlaces: d.loserPlaces ?? 1,
          rewardText1: d.rewardText1 ?? d.rewardText ?? "",
          rewardText2: d.rewardText2 ?? "",
          rewardText3: d.rewardText3 ?? "",
          punishmentText1: d.punishmentText1 ?? d.punishmentText ?? "",
          punishmentText2: d.punishmentText2 ?? "",
          deliveredDivisor: div,
          stockBoundaryMid: String(d.stockBoundaryMid ?? 100),
          stockBoundaryHigh: String(d.stockBoundaryHigh ?? 200),
          stockPointsLow: String(d.stockPointsLow ?? 1),
          stockPointsMid: String(d.stockPointsMid ?? 2),
          stockPointsHigh: String(d.stockPointsHigh ?? 3),
        });
      })
      .finally(() => setLoading(false));
  }, [monthKey]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);
    const res = await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthKey,
        winnerPlaces: form.winnerPlaces,
        loserPlaces: form.loserPlaces,
        rewardText1: form.rewardText1.trim() || null,
        rewardText2: form.rewardText2.trim() || null,
        rewardText3: form.rewardText3.trim() || null,
        punishmentText1: form.punishmentText1.trim() || null,
        punishmentText2: form.punishmentText2.trim() || null,
        deliveredDivisor: Number(form.deliveredDivisor),
        stockBoundaryMid: Number(form.stockBoundaryMid),
        stockBoundaryHigh: Number(form.stockBoundaryHigh),
        stockPointsLow: Number(form.stockPointsLow),
        stockPointsMid: Number(form.stockPointsMid),
        stockPointsHigh: Number(form.stockPointsHigh),
        rewardText: null,
        punishmentText: null,
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof j.error === "string" ? j.error : "Save failed");
      setSaving(false);
      return;
    }
    setSuccess(true);
    setSaving(false);
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Rewards & scoring</h1>
        <p className="text-zinc-400 mt-1">{formatMonthKey(monthKey)}</p>
        <p className="text-sm text-zinc-500 mt-2">
          Configure how many top/bottom ranks show prize or penalty copy on the leaderboard, and how points are calculated for this month.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <Trophy className="h-5 w-5" /> Winner display
              </CardTitle>
              <CardDescription>
                Choose how many podium places show a reward message (1st only, top 2, or full top 3). Fill the lines for each place you use.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-xs">
                <Label>Show rewards on top…</Label>
                <Select
                  value={String(form.winnerPlaces)}
                  onValueChange={(v) => setForm((f) => ({ ...f, winnerPlaces: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st place only</SelectItem>
                    <SelectItem value="2">1st and 2nd</SelectItem>
                    <SelectItem value="3">1st, 2nd, and 3rd</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>1st place — message</Label>
                <Textarea
                  value={form.rewardText1}
                  onChange={(e) => setForm((f) => ({ ...f, rewardText1: e.target.value }))}
                  placeholder="e.g. Bonus 1000 DH, weekend trip…"
                  rows={2}
                />
              </div>
              {form.winnerPlaces >= 2 && (
                <div className="space-y-2">
                  <Label>2nd place — message</Label>
                  <Textarea
                    value={form.rewardText2}
                    onChange={(e) => setForm((f) => ({ ...f, rewardText2: e.target.value }))}
                    rows={2}
                  />
                </div>
              )}
              {form.winnerPlaces >= 3 && (
                <div className="space-y-2">
                  <Label>3rd place — message</Label>
                  <Textarea
                    value={form.rewardText3}
                    onChange={(e) => setForm((f) => ({ ...f, rewardText3: e.target.value }))}
                    rows={2}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" /> Bottom ranks (penalty copy)
              </CardTitle>
              <CardDescription>
                Choose whether only the last place, or the last two, show the penalty text on the leaderboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-xs">
                <Label>Show penalty on…</Label>
                <Select
                  value={String(form.loserPlaces)}
                  onValueChange={(v) => setForm((f) => ({ ...f, loserPlaces: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last place only</SelectItem>
                    <SelectItem value="2">Last two places</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Last place — message</Label>
                <Textarea
                  value={form.punishmentText1}
                  onChange={(e) => setForm((f) => ({ ...f, punishmentText1: e.target.value }))}
                  placeholder="e.g. Review meeting, -20% commission…"
                  rows={2}
                />
              </div>
              {form.loserPlaces >= 2 && (
                <div className="space-y-2">
                  <Label>Second-to-last — message</Label>
                  <Textarea
                    value={form.punishmentText2}
                    onChange={(e) => setForm((f) => ({ ...f, punishmentText2: e.target.value }))}
                    rows={2}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-400">
                <Calculator className="h-5 w-5" /> Point rules (this month)
              </CardTitle>
              <CardDescription>
                Managers see these rules on their dashboard. The leaderboard uses the same math.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-xs">
                <Label>Delivered orders per 1 point</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={form.deliveredDivisor}
                  onChange={(e) => setForm((f) => ({ ...f, deliveredDivisor: e.target.value }))}
                />
                <p className="text-xs text-zinc-500">
                  Score from delivered = month total ÷ this number (default 100 → 1 pt per 100 orders).
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stock qty — min for mid tier</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.stockBoundaryMid}
                    onChange={(e) => setForm((f) => ({ ...f, stockBoundaryMid: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stock qty — min for high tier</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.stockBoundaryHigh}
                    onChange={(e) => setForm((f) => ({ ...f, stockBoundaryHigh: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Pts (low tier)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.stockPointsLow}
                    onChange={(e) => setForm((f) => ({ ...f, stockPointsLow: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Pts (mid)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.stockPointsMid}
                    onChange={(e) => setForm((f) => ({ ...f, stockPointsMid: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Pts (high)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.stockPointsHigh}
                    onChange={(e) => setForm((f) => ({ ...f, stockPointsHigh: e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Each stock line: if qty ≥ high boundary → high pts; else if qty ≥ mid boundary → mid pts; else → low pts.
              </p>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400">Saved.</p>}

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Saving…" : "Save all settings"}
          </Button>
        </form>
      )}
    </div>
  );
}
