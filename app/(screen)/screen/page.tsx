"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { formatMonthKey } from "@/lib/utils";
import { Trophy, Medal, Crown, TrendingUp, TrendingDown, Flame } from "lucide-react";
import type { LeaderboardData, LeaderboardEntry } from "@/types";
import { punishmentTextForRank, rewardTextForRank } from "@/lib/month-rewards";

const REFRESH_INTERVAL = 10000;

const medalConfig = [
  { icon: <Crown className="h-6 w-6 text-amber-400" />, ringColor: "ring-amber-500", bgGrad: "from-amber-500/20 to-amber-900/10", textColor: "text-amber-400", border: "border-amber-500/50" },
  { icon: <Medal className="h-6 w-6 text-slate-300" />, ringColor: "ring-slate-400", bgGrad: "from-slate-400/10 to-zinc-900/10", textColor: "text-slate-300", border: "border-slate-400/40" },
  { icon: <Medal className="h-6 w-6 text-amber-600" />, ringColor: "ring-amber-700", bgGrad: "from-amber-700/10 to-zinc-900/10", textColor: "text-amber-600", border: "border-amber-700/40" },
];

function TopCard({
  entry,
  rank,
  rewardLine,
  punishmentLine,
  delta,
}: {
  entry: LeaderboardEntry;
  rank: number;
  rewardLine: string | null;
  punishmentLine: string | null;
  delta?: "up" | "down";
}) {
  const cfg = medalConfig[rank - 1];
  const isFirst = rank === 1;
  return (
    <div className={`flex flex-col items-center rounded-3xl border ${cfg.border} bg-gradient-to-b ${cfg.bgGrad} p-6 ring-1 ${cfg.ringColor} ${isFirst ? "scale-110 shadow-2xl shadow-amber-500/20" : ""} ${delta === "up" ? "animate-rank-up" : ""} ${delta === "down" ? "animate-rank-down" : ""}`}>
      <div className="mb-2">{cfg.icon}</div>
      <div className={`relative rounded-full ring-2 ${cfg.ringColor} ring-offset-2 ring-offset-zinc-950`}>
        <Avatar name={entry.name} avatarUrl={entry.avatarUrl} size={isFirst ? "xl" : "lg"} />
      </div>
      <p className={`mt-3 text-lg font-bold ${isFirst ? "text-xl" : ""} text-white`}>{entry.name}</p>
      <p className={`text-4xl font-black mt-1 ${cfg.textColor}`}>{entry.totalScoreVal.toFixed(1)}</p>
      <p className="text-xs text-zinc-400 mb-2">pts</p>
      <div className="flex gap-4 text-center text-sm mt-1">
        <div><p className="text-zinc-400 text-xs">Delivered</p><p className="font-bold text-zinc-200">{entry.deliveredTotal}</p></div>
        <div><p className="text-zinc-400 text-xs">Stock</p><p className="font-bold text-zinc-200">{entry.stockQty}</p></div>
      </div>
      {delta && (
        <p className={`mt-2 text-xs font-bold ${delta === "up" ? "text-emerald-300" : "text-red-300"}`}>
          {delta === "up" ? "↑ climbed rank" : "↓ dropped rank"}
        </p>
      )}
      {rewardLine && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-center w-full max-w-xs">
          <p className="text-sm font-bold text-amber-400">{rewardLine}</p>
        </div>
      )}
      {punishmentLine && (
        <div className="mt-2 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-1.5 text-center w-full max-w-xs">
          <p className="text-sm font-bold text-red-400">{punishmentLine}</p>
        </div>
      )}
      {entry.note && (
        <p className="mt-2 text-xs italic text-indigo-300">&quot;{entry.note}&quot;</p>
      )}
    </div>
  );
}

function RankBar({
  entry,
  punishmentLine,
  delta,
}: {
  entry: LeaderboardEntry;
  punishmentLine: string | null;
  delta?: "up" | "down";
}) {
  return (
    <div className={`flex items-center gap-5 rounded-2xl px-6 py-4 ${punishmentLine ? "border border-red-700/60 bg-red-950/35" : "border border-zinc-800/60 bg-zinc-900/40"} ${delta === "up" ? "animate-rank-up" : ""} ${delta === "down" ? "animate-rank-down" : ""}`}>
      <span className="w-8 text-center text-lg font-bold text-zinc-500">{entry.rank}</span>
      <Avatar name={entry.name} avatarUrl={entry.avatarUrl} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-lg font-bold text-white">{entry.name}</p>
        {entry.note && <p className="text-sm italic text-indigo-300">&quot;{entry.note}&quot;</p>}
        {punishmentLine && <p className="text-sm text-red-300 font-semibold uppercase tracking-wide">{punishmentLine}</p>}
      </div>
      <div className="flex gap-8 text-center">
        <div><p className="text-xs text-zinc-400">Delivered</p><p className="text-lg font-bold text-zinc-100">{entry.deliveredTotal}</p></div>
        <div><p className="text-xs text-zinc-400">Stock</p><p className="text-lg font-bold text-zinc-100">{entry.stockQty}</p></div>
        <div><p className="text-xs text-zinc-400">Score</p><p className="text-2xl font-black text-indigo-400">{entry.totalScoreVal.toFixed(1)}</p></div>
      </div>
      {delta === "up" && <TrendingUp className="h-5 w-5 text-emerald-300" />}
      {delta === "down" && <TrendingDown className="h-5 w-5 text-red-300" />}
    </div>
  );
}

export default function ScreenPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [movers, setMovers] = useState<Record<string, "up" | "down">>({});

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/leaderboard");
    if (res.ok) {
      const next = (await res.json()) as LeaderboardData;
      setData((prev) => {
        if (prev?.entries?.length) {
          const prevRanks = new Map(prev.entries.map((e) => [e.userId, e.rank]));
          const nextMovers: Record<string, "up" | "down"> = {};
          for (const e of next.entries) {
            const old = prevRanks.get(e.userId);
            if (!old || old === e.rank) continue;
            nextMovers[e.userId] = e.rank < old ? "up" : "down";
          }
          setMovers(nextMovers);
          window.setTimeout(() => setMovers({}), 3000);
        }
        return next;
      });
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const id = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  const podiumOrder = [1, 0, 2];
  const top3 = data?.entries.slice(0, 3) ?? [];
  const rest = data?.entries.slice(3) ?? [];
  const total = data?.entries.length ?? 0;
  const winnerPlaces = data?.winnerPlaces ?? 3;
  const loserPlaces = data?.loserPlaces ?? 1;
  const rewardTexts = data?.rewardTexts ?? [data?.rewardText ?? null, null, null];
  const punishmentTexts = data?.punishmentTexts ?? [data?.punishmentText ?? null, null];
  const design = data?.leaderboardDesign ?? "CLASSIC";
  const winners = useMemo(
    () => (data?.entries ?? []).filter((e) =>
      rewardTextForRank(e.rank, winnerPlaces, rewardTexts as [string | null, string | null, string | null])
    ),
    [data, winnerPlaces, rewardTexts]
  );
  const losers = useMemo(
    () => (data?.entries ?? []).filter((e) =>
      punishmentTextForRank(e.rank, total, loserPlaces, punishmentTexts as [string | null, string | null])
    ),
    [data, total, loserPlaces, punishmentTexts]
  );

  return (
    <div className="min-h-screen flex flex-col p-8">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <Trophy className="h-10 w-10 text-amber-400" />
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Shipeh Leaderboard</h1>
            <p className="text-zinc-400">{data ? formatMonthKey(data.monthKey) : "Loading..."}</p>
          </div>
        </div>
        <p className="text-xs text-zinc-600">Updated {lastRefresh.toLocaleTimeString()}</p>
      </div>
      {design === "ARENA" && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/25 p-3">
            <p className="text-xs text-amber-300 uppercase tracking-wider font-bold">Reward Zone</p>
            <p className="text-sm text-zinc-200 mt-1">{winners.map((w) => `#${w.rank} ${w.name}`).join(" · ") || "—"}</p>
          </div>
          <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/25 p-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-indigo-300" />
            <p className="text-sm text-zinc-200">Live rank battles: movement highlights for 3 seconds.</p>
          </div>
          <div className="rounded-xl border border-red-500/40 bg-red-950/25 p-3">
            <p className="text-xs text-red-300 uppercase tracking-wider font-bold">Danger Zone</p>
            <p className="text-sm text-zinc-200 mt-1">{losers.map((l) => `#${l.rank} ${l.name}`).join(" · ") || "—"}</p>
          </div>
        </div>
      )}

      {!data || data.entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500 text-2xl">No rankings yet this month</p>
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-6 mb-12 flex-wrap">
              {podiumOrder.map((idx) => {
                const entry = top3[idx];
                if (!entry) return <div key={idx} className="w-56" />;
                const rw = rewardTextForRank(entry.rank, winnerPlaces, rewardTexts as [string | null, string | null, string | null]);
                const pun = punishmentTextForRank(entry.rank, total, loserPlaces, punishmentTexts as [string | null, string | null]);
                return (
                  <TopCard
                    key={entry.userId}
                    entry={entry}
                    rank={entry.rank}
                    rewardLine={rw}
                    punishmentLine={pun}
                    delta={movers[entry.userId]}
                  />
                );
              })}
            </div>
          )}

          {rest.length > 0 && (
            <div className="space-y-3 max-w-4xl mx-auto w-full">
              {rest.map((entry) => (
                <RankBar
                  key={entry.userId}
                  entry={entry}
                  punishmentLine={punishmentTextForRank(entry.rank, total, loserPlaces, punishmentTexts as [string | null, string | null])}
                  delta={movers[entry.userId]}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
