"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { formatMonthKey } from "@/lib/utils";
import { Trophy, Medal, Crown } from "lucide-react";
import type { LeaderboardData, LeaderboardEntry } from "@/types";

const REFRESH_INTERVAL = 10000;

const medalConfig = [
  { icon: <Crown className="h-6 w-6 text-amber-400" />, ringColor: "ring-amber-500", bgGrad: "from-amber-500/20 to-amber-900/10", textColor: "text-amber-400", border: "border-amber-500/50" },
  { icon: <Medal className="h-6 w-6 text-slate-300" />, ringColor: "ring-slate-400", bgGrad: "from-slate-400/10 to-zinc-900/10", textColor: "text-slate-300", border: "border-slate-400/40" },
  { icon: <Medal className="h-6 w-6 text-amber-600" />, ringColor: "ring-amber-700", bgGrad: "from-amber-700/10 to-zinc-900/10", textColor: "text-amber-600", border: "border-amber-700/40" },
];

function TopCard({ entry, rank, rewardText }: { entry: LeaderboardEntry; rank: number; rewardText: string | null }) {
  const cfg = medalConfig[rank - 1];
  const isFirst = rank === 1;
  return (
    <div className={`flex flex-col items-center rounded-3xl border ${cfg.border} bg-gradient-to-b ${cfg.bgGrad} p-6 ring-1 ${cfg.ringColor} ${isFirst ? "scale-110 shadow-2xl shadow-amber-500/20" : ""}`}>
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
      {isFirst && rewardText && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-center">
          <p className="text-sm font-bold text-amber-400">{rewardText}</p>
        </div>
      )}
      {entry.note && (
        <p className="mt-2 text-xs italic text-indigo-300">&quot;{entry.note}&quot;</p>
      )}
    </div>
  );
}

function RankBar({ entry, isLast, punishmentText }: { entry: LeaderboardEntry; isLast: boolean; punishmentText: string | null }) {
  return (
    <div className={`flex items-center gap-5 rounded-2xl px-6 py-4 ${isLast ? "border border-red-700/50 bg-red-950/20" : "border border-zinc-800/60 bg-zinc-900/40"}`}>
      <span className="w-8 text-center text-lg font-bold text-zinc-500">{entry.rank}</span>
      <Avatar name={entry.name} avatarUrl={entry.avatarUrl} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-lg font-bold text-white">{entry.name}</p>
        {entry.note && <p className="text-sm italic text-indigo-300">&quot;{entry.note}&quot;</p>}
        {isLast && punishmentText && <p className="text-sm text-red-400 font-semibold">{punishmentText}</p>}
      </div>
      <div className="flex gap-8 text-center">
        <div><p className="text-xs text-zinc-400">Delivered</p><p className="text-lg font-bold text-zinc-100">{entry.deliveredTotal}</p></div>
        <div><p className="text-xs text-zinc-400">Stock</p><p className="text-lg font-bold text-zinc-100">{entry.stockQty}</p></div>
        <div><p className="text-xs text-zinc-400">Score</p><p className="text-2xl font-black text-indigo-400">{entry.totalScoreVal.toFixed(1)}</p></div>
      </div>
    </div>
  );
}

export default function ScreenPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/leaderboard");
    if (res.ok) { setData(await res.json()); setLastRefresh(new Date()); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const id = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd
  const top3 = data?.entries.slice(0, 3) ?? [];
  const rest = data?.entries.slice(3) ?? [];
  const lastEntry = data?.entries[data.entries.length - 1];

  return (
    <div className="min-h-screen flex flex-col p-8">
      {/* Header */}
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

      {!data || data.entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500 text-2xl">No rankings yet this month</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-6 mb-12">
              {podiumOrder.map((idx) => {
                const entry = top3[idx];
                if (!entry) return <div key={idx} className="w-56" />;
                return <TopCard key={entry.userId} entry={entry} rank={entry.rank} rewardText={data.rewardText} />;
              })}
            </div>
          )}

          {/* Rest */}
          {rest.length > 0 && (
            <div className="space-y-3 max-w-4xl mx-auto w-full">
              {rest.map((entry) => (
                <RankBar
                  key={entry.userId}
                  entry={entry}
                  isLast={entry.userId === lastEntry?.userId && (data?.entries.length ?? 0) > 1}
                  punishmentText={data.punishmentText}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
