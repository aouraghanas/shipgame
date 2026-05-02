"use client";

import { Avatar } from "@/components/shared/Avatar";
import type { LeaderboardEntry } from "@/types";
import { useT } from "@/components/shared/I18nProvider";

interface Props {
  entry: LeaderboardEntry;
  punishmentText: string | null;
}

export function RankRow({ entry, punishmentText }: Props) {
  const t = useT();
  const isDanger = Boolean(punishmentText);
  return (
    <div
      className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-colors ${
        isDanger
          ? "border-l-[3px] border-l-brand border border-zinc-800/60 bg-red-500/10"
          : "border border-zinc-800/60 bg-zinc-900/50 hover:bg-zinc-800/50"
      }`}
    >
      <div className="w-8 text-center font-bold text-zinc-500 text-sm flex-shrink-0">
        {entry.rank}
      </div>

      <Avatar name={entry.name} avatarUrl={entry.avatarUrl} size="sm" />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-100 truncate">{entry.name}</p>
        {entry.note && (
          <p className="text-xs text-brand italic truncate">&quot;{entry.note}&quot;</p>
        )}
        {punishmentText && (
          <p className="text-xs text-brand font-semibold uppercase tracking-wide">
            {punishmentText}
          </p>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-6 text-center text-sm flex-shrink-0">
        <div>
          <p className="text-zinc-400 text-xs">{t("leaderboard.delivered")}</p>
          <p className="font-semibold text-zinc-100">{entry.deliveredTotal}</p>
        </div>
        <div>
          <p className="text-zinc-400 text-xs">{t("leaderboard.stockQty")}</p>
          <p className="font-semibold text-zinc-100">{entry.stockQty}</p>
        </div>
        <div>
          <p className="text-zinc-400 text-xs">{t("leaderboard.score")}</p>
          <p className="font-bold text-brand">{entry.totalScoreVal.toFixed(1)}</p>
        </div>
      </div>

      <div className="sm:hidden font-bold text-brand text-sm flex-shrink-0">
        {entry.totalScoreVal.toFixed(1)}
      </div>
    </div>
  );
}
