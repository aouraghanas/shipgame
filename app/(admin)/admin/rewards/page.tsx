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
  leaderboardDesign: "CLASSIC" | "ARENA";
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
  // Confirmation-agent (call-center) config
  confTreatedPoints: string;
  confConfirmedPoints: string;
  confDeliveredPoints: string;
  confWinnerPlaces: number;
  confLoserPlaces: number;
  confRewardText1: string;
  confRewardText2: string;
  confRewardText3: string;
  confPunishmentText1: string;
  confPunishmentText2: string;
};

const defaultForm = (): FormState => ({
  leaderboardDesign: "CLASSIC",
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
  confTreatedPoints: "1",
  confConfirmedPoints: "5",
  confDeliveredPoints: "20",
  confWinnerPlaces: 3,
  confLoserPlaces: 1,
  confRewardText1: "",
  confRewardText2: "",
  confRewardText3: "",
  confPunishmentText1: "",
  confPunishmentText2: "",
});

/** Decimal fields arrive from the API as strings (or numbers); normalize to a plain string. */
function decToStr(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "object" && "toString" in v) return (v as { toString: () => string }).toString();
  return String(v);
}

export default function RewardsPage() {
  const monthKey = getCurrentMonthKey();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [tab, setTab] = useState<"managers" | "confirmation">("managers");
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
          leaderboardDesign: d.leaderboardDesign ?? "CLASSIC",
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
          confTreatedPoints: String(decToStr(d.confTreatedPoints) ?? "1"),
          confConfirmedPoints: String(decToStr(d.confConfirmedPoints) ?? "5"),
          confDeliveredPoints: String(decToStr(d.confDeliveredPoints) ?? "20"),
          confWinnerPlaces: d.confWinnerPlaces ?? 3,
          confLoserPlaces: d.confLoserPlaces ?? 1,
          confRewardText1: d.confRewardText1 ?? "",
          confRewardText2: d.confRewardText2 ?? "",
          confRewardText3: d.confRewardText3 ?? "",
          confPunishmentText1: d.confPunishmentText1 ?? "",
          confPunishmentText2: d.confPunishmentText2 ?? "",
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
        leaderboardDesign: form.leaderboardDesign,
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
        confTreatedPoints: Number(form.confTreatedPoints),
        confConfirmedPoints: Number(form.confConfirmedPoints),
        confDeliveredPoints: Number(form.confDeliveredPoints),
        confWinnerPlaces: form.confWinnerPlaces,
        confLoserPlaces: form.confLoserPlaces,
        confRewardText1: form.confRewardText1.trim() || null,
        confRewardText2: form.confRewardText2.trim() || null,
        confRewardText3: form.confRewardText3.trim() || null,
        confPunishmentText1: form.confPunishmentText1.trim() || null,
        confPunishmentText2: form.confPunishmentText2.trim() || null,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">{formatMonthKey(monthKey)}</p>
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          <button
            type="button"
            onClick={() => setTab("managers")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "managers" ? "brand-keep bg-brand text-white" : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            Account Managers
          </button>
          <button
            type="button"
            onClick={() => setTab("confirmation")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "confirmation" ? "brand-keep bg-brand text-white" : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            Confirmation Agents
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-8">
          <div className={tab === "managers" ? "space-y-8" : "hidden"}>
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard design version</CardTitle>
              <CardDescription>
                Keep the classic design or switch to the competitive office mode with stronger winner/loser visibility.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-w-sm">
              <Select
                value={form.leaderboardDesign}
                onValueChange={(v: "CLASSIC" | "ARENA") => setForm((f) => ({ ...f, leaderboardDesign: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLASSIC">Classic leaderboard</SelectItem>
                  <SelectItem value="ARENA">Competitive office mode</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

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
          </div>

          {/* ——— Confirmation agents (call center) ——— */}
          <div className={tab === "confirmation" ? "space-y-8" : "hidden"}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-400">
                  <Calculator className="h-5 w-5" /> Point rules — confirmation agents
                </CardTitle>
                <CardDescription>
                  Points = orders treated × (treated pts) + confirmed × (confirmed pts) + delivered × (delivered pts).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Points per treated</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      value={form.confTreatedPoints}
                      onChange={(e) => setForm((f) => ({ ...f, confTreatedPoints: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Points per confirmed</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      value={form.confConfirmedPoints}
                      onChange={(e) => setForm((f) => ({ ...f, confConfirmedPoints: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Points per delivered</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      value={form.confDeliveredPoints}
                      onChange={(e) => setForm((f) => ({ ...f, confDeliveredPoints: e.target.value }))}
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-3">
                  Example: 1 / 5 / 20 → a treated order = 1 pt, a confirmed = 5 pts, a delivered = 20 pts.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-400">
                  <Trophy className="h-5 w-5" /> Winner display — confirmation agents
                </CardTitle>
                <CardDescription>
                  How many top places show a reward message on the call-center leaderboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-xs">
                  <Label>Show rewards on top…</Label>
                  <Select
                    value={String(form.confWinnerPlaces)}
                    onValueChange={(v) => setForm((f) => ({ ...f, confWinnerPlaces: Number(v) }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    value={form.confRewardText1}
                    onChange={(e) => setForm((f) => ({ ...f, confRewardText1: e.target.value }))}
                    placeholder="e.g. Bonus for top confirmer…"
                    rows={2}
                  />
                </div>
                {form.confWinnerPlaces >= 2 && (
                  <div className="space-y-2">
                    <Label>2nd place — message</Label>
                    <Textarea
                      value={form.confRewardText2}
                      onChange={(e) => setForm((f) => ({ ...f, confRewardText2: e.target.value }))}
                      rows={2}
                    />
                  </div>
                )}
                {form.confWinnerPlaces >= 3 && (
                  <div className="space-y-2">
                    <Label>3rd place — message</Label>
                    <Textarea
                      value={form.confRewardText3}
                      onChange={(e) => setForm((f) => ({ ...f, confRewardText3: e.target.value }))}
                      rows={2}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-5 w-5" /> Bottom ranks — confirmation agents
                </CardTitle>
                <CardDescription>
                  Whether only the last place, or the last two, show the penalty text.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-xs">
                  <Label>Show penalty on…</Label>
                  <Select
                    value={String(form.confLoserPlaces)}
                    onValueChange={(v) => setForm((f) => ({ ...f, confLoserPlaces: Number(v) }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Last place only</SelectItem>
                      <SelectItem value="2">Last two places</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Last place — message</Label>
                  <Textarea
                    value={form.confPunishmentText1}
                    onChange={(e) => setForm((f) => ({ ...f, confPunishmentText1: e.target.value }))}
                    rows={2}
                  />
                </div>
                {form.confLoserPlaces >= 2 && (
                  <div className="space-y-2">
                    <Label>Second-to-last — message</Label>
                    <Textarea
                      value={form.confPunishmentText2}
                      onChange={(e) => setForm((f) => ({ ...f, confPunishmentText2: e.target.value }))}
                      rows={2}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

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
