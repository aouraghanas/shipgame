"use client";

import { useEffect, useState, useCallback } from "react";
import { TopThreeCards } from "./TopThreeCards";
import { RankRow } from "./RankRow";
import { formatMonthKey } from "@/lib/utils";
import type { LeaderboardData, LeaderboardEntry } from "@/types";
import { punishmentTextForRank, rewardTextForRank } from "@/lib/month-rewards";
import { Trophy, Flame, ShieldAlert } from "lucide-react";

interface Props {
  initialData?: LeaderboardData;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

function ClassicBoard({ data }: { data: LeaderboardData }) {
  const winnerPlaces = data.winnerPlaces ?? 3;
  const loserPlaces = data.loserPlaces ?? 1;
  const rewardTexts = data.rewardTexts ?? [data.rewardText, null, null];
  const punishmentTexts = data.punishmentTexts ?? [data.punishmentText, null];
  const total = data.entries.length;
  const top3 = data.entries.slice(0, 3);
  const rest = data.entries.slice(3);

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">{formatMonthKey(data.monthKey)}</h2>
        <p className="text-zinc-400 text-sm mt-1">
          {data.entries.length} manager{data.entries.length !== 1 ? "s" : ""} competing
        </p>
      </div>

      <TopThreeCards
        entries={top3}
        winnerPlaces={winnerPlaces}
        rewardTexts={rewardTexts}
        loserPlaces={loserPlaces}
        punishmentTexts={punishmentTexts}
        totalManagers={total}
      />

      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((entry: LeaderboardEntry) => (
            <RankRow
              key={entry.userId}
              entry={entry}
              punishmentText={punishmentTextForRank(entry.rank, total, loserPlaces, punishmentTexts)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CompetitiveBoard({ data }: { data: LeaderboardData }) {
  const winnerPlaces = data.winnerPlaces ?? 3;
  const loserPlaces = data.loserPlaces ?? 1;
  const rewardTexts = data.rewardTexts ?? [data.rewardText, null, null];
  const punishmentTexts = data.punishmentTexts ?? [data.punishmentText, null];
  const total = data.entries.length;

  const top3 = data.entries.slice(0, 3);
  const winners = data.entries.filter((e) => rewardTextForRank(e.rank, winnerPlaces, rewardTexts));
  const danger = data.entries.filter((e) => punishmentTextForRank(e.rank, total, loserPlaces, punishmentTexts));
  const middle = data.entries.filter(
    (e) =>
      !rewardTextForRank(e.rank, winnerPlaces, rewardTexts) &&
      !punishmentTextForRank(e.rank, total, loserPlaces, punishmentTexts)
  );

  return (
    <div>
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-zinc-900 to-zinc-900 px-5 py-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-indigo-300">Competition Mode</p>
            <h2 className="text-2xl font-black text-white">Office Battleboard · {formatMonthKey(data.monthKey)}</h2>
            <p className="text-zinc-400 text-sm mt-1">{data.entries.length} managers competing</p>
          </div>
          <div className="text-right text-sm text-zinc-300">
            <p className="font-semibold text-amber-300">Top {winnerPlaces} reward zone</p>
            <p className="font-semibold text-red-300">Bottom {loserPlaces} danger zone</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-7">
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/25 p-4">
          <p className="text-amber-300 font-bold flex items-center gap-2"><Trophy className="h-4 w-4" /> Winner Zone</p>
          <div className="mt-3 space-y-2">
            {winners.map((entry) => (
              <div key={entry.userId} className="rounded-lg border border-amber-500/30 bg-zinc-900/70 px-3 py-2">
                <p className="text-sm font-bold text-white">#{entry.rank} {entry.name}</p>
                <p className="text-xs text-amber-300">{rewardTextForRank(entry.rank, winnerPlaces, rewardTexts)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-indigo-500/35 bg-indigo-950/20 p-4">
          <p className="text-indigo-300 font-bold flex items-center gap-2"><Flame className="h-4 w-4" /> Motivation</p>
          <p className="text-sm text-zinc-300 mt-2">Beat the score above you to climb. Live movement happens through the day on the office screen.</p>
        </div>
        <div className="rounded-2xl border border-red-500/40 bg-red-950/25 p-4">
          <p className="text-red-300 font-bold flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Danger Zone</p>
          <div className="mt-3 space-y-2">
            {danger.map((entry) => (
              <div key={entry.userId} className="rounded-lg border border-red-500/40 bg-zinc-900/80 px-3 py-2">
                <p className="text-sm font-bold text-white">#{entry.rank} {entry.name}</p>
                <p className="text-xs text-red-300">{punishmentTextForRank(entry.rank, total, loserPlaces, punishmentTexts)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TopThreeCards
        entries={top3}
        winnerPlaces={winnerPlaces}
        rewardTexts={rewardTexts}
        loserPlaces={loserPlaces}
        punishmentTexts={punishmentTexts}
        totalManagers={total}
      />

      <div className="space-y-2 mb-4">
        {middle.map((entry) => (
          <RankRow key={entry.userId} entry={entry} punishmentText={null} />
        ))}
      </div>

      {danger.length > 0 && (
        <div className="space-y-2">
          {danger.map((entry) => (
            <RankRow
              key={entry.userId}
              entry={entry}
              punishmentText={punishmentTextForRank(entry.rank, total, loserPlaces, punishmentTexts)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LeaderboardView({
  initialData,
  autoRefresh = false,
  refreshInterval = 10000,
}: Props) {
  const [data, setData] = useState<LeaderboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) fetchData();
  }, [fetchData, initialData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, refreshInterval);
    return () => clearInterval(id);
  }, [autoRefresh, refreshInterval, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.entries.length === 0) {
    return <div className="text-center py-20 text-zinc-500">No rankings yet for this month.</div>;
  }

  return data.leaderboardDesign === "ARENA" ? <CompetitiveBoard data={data} /> : <ClassicBoard data={data} />;
}
