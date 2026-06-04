"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentMonthKey, formatMonthKey } from "@/lib/utils";
import {
  DEFAULT_CONFIRMATION_SCORING,
  confirmationScore,
  confirmationRate,
  type ConfirmationScoringConfig,
} from "@/lib/confirmation-scoring";
import { PhoneCall, CheckCircle2, PackageCheck, Trophy, Ticket } from "lucide-react";

export default function ConfirmationDashboardPage() {
  const { data: session } = useSession();
  const monthKey = getCurrentMonthKey();

  const [treated, setTreated] = useState(0);
  const [confirmed, setConfirmed] = useState(0);
  const [delivered, setDelivered] = useState(0);
  const [editTreated, setEditTreated] = useState("");
  const [editConfirmed, setEditConfirmed] = useState("");
  const [editDelivered, setEditDelivered] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [cfg, setCfg] = useState<ConfirmationScoringConfig>(DEFAULT_CONFIRMATION_SCORING);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/confirmation-performance?month=${monthKey}`)
      .then((r) => r.json())
      .then((d) => {
        setTreated(d.treated ?? 0);
        setConfirmed(d.confirmed ?? 0);
        setDelivered(d.delivered ?? 0);
        setEditTreated(String(d.treated ?? 0));
        setEditConfirmed(String(d.confirmed ?? 0));
        setEditDelivered(String(d.delivered ?? 0));
      });

    fetch(`/api/confirmation-leaderboard?month=${monthKey}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.scoring) {
          setCfg({
            treatedPoints: Number(d.scoring.treatedPoints) || DEFAULT_CONFIRMATION_SCORING.treatedPoints,
            confirmedPoints: Number(d.scoring.confirmedPoints) || DEFAULT_CONFIRMATION_SCORING.confirmedPoints,
            deliveredPoints: Number(d.scoring.deliveredPoints) || DEFAULT_CONFIRMATION_SCORING.deliveredPoints,
          });
        }
      });
  }, [session, monthKey]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    const tVal = Number(editTreated);
    const cVal = Number(editConfirmed);
    const dVal = Number(editDelivered);

    // Sanity: confirmed/delivered cannot exceed treated; delivered ≤ confirmed.
    if (cVal > tVal) {
      setErrorMsg("Confirmed cannot be greater than treated.");
      setSaving(false);
      return;
    }
    if (dVal > cVal) {
      setErrorMsg("Delivered cannot be greater than confirmed.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/confirmation-performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ treated: tVal, confirmed: cVal, delivered: dVal, monthKey }),
    });
    if (res.ok) {
      setTreated(tVal);
      setConfirmed(cVal);
      setDelivered(dVal);
      setSuccessMsg("Your totals were updated!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      const j = await res.json().catch(() => ({}));
      setErrorMsg(typeof j?.error === "string" ? j.error : "Could not save. Please try again.");
    }
    setSaving(false);
  }

  const total = confirmationScore(treated, confirmed, delivered, cfg);
  const rate = confirmationRate(treated, confirmed);

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-400">{formatMonthKey(monthKey)}</p>

      <Link href="/tickets" className="group block mb-6">
        <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/30 px-4 py-4 flex items-center gap-4 transition-colors hover:border-indigo-400/70 hover:bg-indigo-950/45">
          <div className="p-3 rounded-lg bg-indigo-600/30">
            <Ticket className="h-6 w-6 text-indigo-300 shrink-0" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white">Support tickets</p>
            <p className="text-sm text-zinc-400">Open a ticket for order issues, logistics, or platform problems</p>
          </div>
          <span className="text-indigo-400 text-sm shrink-0 ml-auto group-hover:text-indigo-300">Go →</span>
        </div>
      </Link>

      {/* Score summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Orders Treated", value: treated, icon: PhoneCall, color: "text-sky-400" },
          { label: "Confirmed", value: confirmed, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Delivered", value: delivered, icon: PackageCheck, color: "text-purple-400" },
          { label: "Total Points", value: total.toLocaleString(), icon: Trophy, color: "text-amber-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <s.icon className={`h-4 w-4 ${s.color}`} /> {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {successMsg && (
        <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-emerald-400 text-sm">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-sky-400" /> Update your month-to-date totals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400 mb-4">
            Each day, enter your running totals since the 1st of the month (they should normally grow day to day). This replaces your previous values.
          </p>
          <form onSubmit={save} className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Orders treated</Label>
              <Input type="number" min={0} value={editTreated} onChange={(e) => setEditTreated(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Confirmed</Label>
              <Input type="number" min={0} value={editConfirmed} onChange={(e) => setEditConfirmed(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Delivered</Label>
              <Input type="number" min={0} value={editDelivered} onChange={(e) => setEditDelivered(e.target.value)} required />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? "Saving..." : "Update Totals"}
              </Button>
            </div>
          </form>

          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400 space-y-1">
            <p>
              <span className="text-zinc-200 font-medium">Points:</span>{" "}
              treated × {cfg.treatedPoints} + confirmed × {cfg.confirmedPoints} + delivered × {cfg.deliveredPoints}
              {" = "}
              <span className="text-amber-400 font-semibold">{total.toLocaleString()} pts</span>
            </p>
            <p className="text-xs text-zinc-500">
              Confirmation rate: {(rate * 100).toFixed(1)}% ({confirmed} of {treated})
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
