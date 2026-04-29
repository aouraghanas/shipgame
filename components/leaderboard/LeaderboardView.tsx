"use client";

import { useEffect, useState, useCallback } from "react";
import { TopThreeCards } from "./TopThreeCards";
import { RankRow } from "./RankRow";
import { formatMonthKey } from "@/lib/utils";
import type { LeaderboardData } from "@/types";
import { punishmentTextForRank } from "@/lib/month-rewards";

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
        <h2 className="text-2xl font-bold text-white">
          {formatMonthKey(data.monthKey)}
        </h2>
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
          {rest.map((entry) => (
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
