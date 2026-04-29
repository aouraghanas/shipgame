import { Avatar } from "@/components/shared/Avatar";
import type { LeaderboardEntry } from "@/types";

interface Props {
  entry: LeaderboardEntry;
  punishmentText: string | null;
}

export function RankRow({ entry, punishmentText }: Props) {
  const isDanger = Boolean(punishmentText);
  return (
    <div
      className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-colors ${
        isDanger
          ? "border border-red-700/70 bg-red-950/45 shadow-[0_0_0_1px_rgba(185,28,28,0.25)]"
          : "border border-zinc-800/60 bg-zinc-900/50 hover:bg-zinc-800/50"
      }`}
    >
      {/* Rank */}
      <div className="w-8 text-center font-bold text-zinc-500 text-sm flex-shrink-0">
        {entry.rank}
      </div>

      {/* Avatar */}
      <Avatar name={entry.name} avatarUrl={entry.avatarUrl} size="sm" />

      {/* Name + Note */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-100 truncate">{entry.name}</p>
        {entry.note && (
          <p className="text-xs text-indigo-300 italic truncate">&quot;{entry.note}&quot;</p>
        )}
        {punishmentText && (
          <p className="text-xs text-red-300 font-semibold uppercase tracking-wide">{punishmentText}</p>
        )}
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-6 text-center text-sm flex-shrink-0">
        <div>
          <p className="text-zinc-400 text-xs">Delivered</p>
          <p className="font-semibold text-zinc-100">{entry.deliveredTotal}</p>
        </div>
        <div>
          <p className="text-zinc-400 text-xs">Stock qty</p>
          <p className="font-semibold text-zinc-100">{entry.stockQty}</p>
        </div>
        <div>
          <p className="text-zinc-400 text-xs">Score</p>
          <p className="font-bold text-indigo-400">{entry.totalScoreVal.toFixed(1)}</p>
        </div>
      </div>

      {/* Mobile score */}
      <div className="sm:hidden font-bold text-indigo-400 text-sm flex-shrink-0">
        {entry.totalScoreVal.toFixed(1)}
      </div>
    </div>
  );
}
