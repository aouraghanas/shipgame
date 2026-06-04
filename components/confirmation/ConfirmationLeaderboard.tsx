"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Crown, Medal, Award, RefreshCw } from "lucide-react";
import { getCurrentMonthKey, formatMonthKey } from "@/lib/utils";

type Entry = {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  treated: number;
  confirmed: number;
  delivered: number;
  confirmationRateVal: number;
  totalScoreVal: number;
  note: string | null;
};

type Data = {
  monthKey: string;
  entries: Entry[];
  rewardTexts: (string | null)[];
  punishmentTexts: (string | null)[];
  winnerPlaces: number;
  loserPlaces: number;
};

const RANK_STYLE: Record<number, { ring: string; chip: string; icon: typeof Crown }> = {
  1: { ring: "ring-amber-400/60", chip: "bg-gradient-to-br from-amber-400 to-yellow-600 text-black", icon: Crown },
  2: { ring: "ring-zinc-300/50", chip: "bg-gradient-to-br from-zinc-200 to-zinc-400 text-black", icon: Medal },
  3: { ring: "ring-orange-500/50", chip: "bg-gradient-to-br from-orange-400 to-orange-700 text-black", icon: Award },
};

export function ConfirmationLeaderboard({
  screen = false,
  autoRefresh = false,
  refreshInterval = 15000,
}: {
  screen?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const monthKey = getCurrentMonthKey();

  const load = useCallback(() => {
    fetch(`/api/confirmation-leaderboard?month=${monthKey}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [monthKey]);

  useEffect(() => {
    load();
    if (!autoRefresh) return;
    const id = setInterval(load, refreshInterval);
    return () => clearInterval(id);
  }, [load, autoRefresh, refreshInterval]);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const entries = data?.entries ?? [];
  const total = entries.length;

  return (
    <div className={screen ? "space-y-6" : "space-y-4"}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className={`${screen ? "h-7 w-7" : "h-5 w-5"} text-amber-400`} />
          <h1 className={`font-bold text-zinc-100 ${screen ? "text-3xl" : "text-xl"}`}>
            Call Center Leaderboard
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-zinc-400 ${screen ? "text-xl" : "text-sm"}`}>
            {formatMonthKey(monthKey)}
          </span>
          {!screen && (
            <button
              type="button"
              onClick={load}
              className="text-zinc-500 hover:text-zinc-200"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-center text-zinc-500 py-16">No confirmation agents competing yet this month.</p>
      ) : (
        <div className={screen ? "space-y-3" : "space-y-2"}>
          {entries.map((e) => {
            const style = RANK_STYLE[e.rank];
            const RankIcon = style?.icon;
            const isWinner = e.rank <= (data?.winnerPlaces ?? 0);
            const isLoser =
              total >= 2 &&
              ((data?.loserPlaces ?? 0) >= 1 && e.rank === total) ||
              ((data?.loserPlaces ?? 0) >= 2 && e.rank === total - 1);
            const rewardLine = isWinner ? data?.rewardTexts?.[e.rank - 1] : null;
            const punishLine =
              isLoser && e.rank === total
                ? data?.punishmentTexts?.[0]
                : isLoser
                  ? data?.punishmentTexts?.[1]
                  : null;

            return (
              <Card
                key={e.userId}
                className={`relative ${style ? `ring-1 ${style.ring}` : ""}`}
              >
                <CardContent
                  className={`flex items-center gap-4 ${screen ? "py-5 px-6" : "py-3 px-4"}`}
                >
                  <div
                    className={`flex items-center justify-center rounded-full font-bold shrink-0 ${
                      style ? style.chip : "bg-zinc-800 text-zinc-300"
                    } ${screen ? "h-12 w-12 text-xl" : "h-9 w-9 text-sm"}`}
                  >
                    {RankIcon ? <RankIcon className={screen ? "h-6 w-6" : "h-4 w-4"} /> : e.rank}
                  </div>

                  <Avatar name={e.name} avatarUrl={e.avatarUrl} size={screen ? "lg" : "md"} />

                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-zinc-100 truncate ${screen ? "text-2xl" : "text-base"}`}>
                      {e.name}
                    </p>
                    <p className={`text-zinc-500 ${screen ? "text-base" : "text-xs"}`}>
                      {e.treated} treated · {e.confirmed} confirmed · {e.delivered} delivered ·{" "}
                      {(e.confirmationRateVal * 100).toFixed(0)}% conf.
                    </p>
                    {(rewardLine || punishLine) && (
                      <p
                        className={`mt-0.5 ${screen ? "text-base" : "text-xs"} ${
                          rewardLine ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {rewardLine ?? punishLine}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`font-mono font-bold text-amber-400 ${screen ? "text-3xl" : "text-lg"}`}>
                      {e.totalScoreVal.toLocaleString()}
                    </p>
                    <p className={`text-zinc-500 ${screen ? "text-sm" : "text-[10px]"}`}>points</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
