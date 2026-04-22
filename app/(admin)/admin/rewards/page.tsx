"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCurrentMonthKey, formatMonthKey } from "@/lib/utils";
import { Trophy, AlertTriangle } from "lucide-react";

export default function RewardsPage() {
  const monthKey = getCurrentMonthKey();
  const [reward, setReward] = useState("");
  const [punishment, setPunishment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/rewards?month=${monthKey}`)
      .then((r) => r.json())
      .then((d) => { setReward(d.rewardText ?? ""); setPunishment(d.punishmentText ?? ""); })
      .finally(() => setLoading(false));
  }, [monthKey]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthKey, rewardText: reward || null, punishmentText: punishment || null }),
    });
    setSuccess(true);
    setSaving(false);
  }

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Reward Settings</h1>
        <p className="text-zinc-400 mt-1">{formatMonthKey(monthKey)}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <Trophy className="h-5 w-5" /> First Place Reward
              </CardTitle>
              <CardDescription>Shown on the leaderboard next to the top ranked manager</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="e.g. Bonus 1000 DH, Weekend gift..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" /> Last Place Punishment
              </CardTitle>
              <CardDescription>Shown on the leaderboard next to the last ranked manager</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={punishment}
                onChange={(e) => setPunishment(e.target.value)}
                placeholder="e.g. -20% commission, Warning..."
              />
            </CardContent>
          </Card>

          {success && <p className="text-sm text-emerald-400 text-center">Settings saved successfully.</p>}

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      )}
    </div>
  );
}
