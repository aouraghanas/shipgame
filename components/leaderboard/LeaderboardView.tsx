"use client";

import { useEffect, useState, useCallback } from "react";
import { TopThreeCards } from "./TopThreeCards";
import { RankRow } from "./RankRow";
import { formatMonthKey } from "@/lib/utils";
import type { LeaderboardData } from "@/types";

interface Props {
  initialData?: LeaderboardData;
  autoRefresh?: boolean;
  refreshInterval?: number;
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
    return (
      <div className="text-center py-20 text-zinc-500">
        No rankings yet for this month.
      </div>
    );
  }

  const top3 = data.entries.slice(0, 3);
  const rest = data.entries.slice(3);
  const lastEntry = data.entries[data.entries.length - 1];

  return (
    <div>
      {/* Month heading */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">
          {formatMonthKey(data.monthKey)}
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          {data.entries.length} manager{data.entries.length !== 1 ? "s" : ""} competing
        </p>
      </div>

      {/* Top 3 podium */}
      <TopThreeCards entries={top3} rewardText={data.rewardText} />

      {/* Rest of rankings */}
      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((entry) => (
            <RankRow
              key={entry.userId}
              entry={entry}
              isLast={entry.userId === lastEntry?.userId && data.entries.length > 1}
              punishmentText={data.punishmentText}
            />
          ))}
        </div>
      )}

      {/* Last place note if only 1-3 managers */}
      {data.entries.length > 1 && top3.length === data.entries.length && (
        <div className="mt-4 rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 flex items-center gap-4">
          <div className="w-8 text-center font-bold text-zinc-500 text-sm">
            {lastEntry.rank}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-zinc-100">{lastEntry.name}</p>
            {data.punishmentText && (
              <p className="text-xs text-red-400 font-medium">{data.punishmentText}</p>
            )}
          </div>
          <div className="font-bold text-indigo-400">{lastEntry.totalScoreVal.toFixed(1)}</div>
        </div>
      )}
    </div>
  );
}
