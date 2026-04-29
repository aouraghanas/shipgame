import { Avatar } from "@/components/shared/Avatar";
import { Trophy, Medal, Award } from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { punishmentTextForRank, rewardTextForRank } from "@/lib/month-rewards";

interface Props {
  entries: LeaderboardEntry[];
  winnerPlaces: number;
  rewardTexts: [string | null, string | null, string | null];
  loserPlaces: number;
  punishmentTexts: [string | null, string | null];
  totalManagers: number;
}

/**
 * Per-podium-rank visual style.
 * Colors are intentionally chosen to render clearly on BOTH dark and
 * light surfaces: amber-500/slate-500/amber-700 stay readable on white.
 */
const podiumStyles = [
  {
    label: "1st",
    icon: <Trophy className="h-3.5 w-3.5" />,
    accentBar: "bg-gradient-to-r from-amber-400 to-amber-600",
    chip: "bg-amber-500 text-white",
    score: "text-amber-500",
    rewardChip: "bg-amber-500 text-white",
    border: "border-amber-500/40",
  },
  {
    label: "2nd",
    icon: <Medal className="h-3.5 w-3.5" />,
    accentBar: "bg-gradient-to-r from-slate-300 to-slate-500",
    chip: "bg-slate-500 text-white",
    score: "text-slate-500",
    rewardChip: "bg-slate-500 text-white",
    border: "border-slate-400/40",
  },
  {
    label: "3rd",
    icon: <Award className="h-3.5 w-3.5" />,
    accentBar: "bg-gradient-to-r from-amber-700 to-amber-900",
    chip: "bg-amber-700 text-white",
    score: "text-amber-700",
    rewardChip: "bg-amber-700 text-white",
    border: "border-amber-700/40",
  },
];

const podiumOrder = [1, 0, 2];

export function TopThreeCards({
  entries,
  winnerPlaces,
  rewardTexts,
  loserPlaces,
  punishmentTexts,
  totalManagers,
}: Props) {
  const top3 = entries.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="flex items-end justify-center gap-4 mb-8 flex-wrap">
      {podiumOrder.map((idx) => {
        const entry = top3[idx];
        if (!entry) return <div key={idx} className="w-48" />;
        const style = podiumStyles[idx];
        const isFirst = idx === 0;
        const rw = rewardTextForRank(entry.rank, winnerPlaces, rewardTexts);
        const pun = punishmentTextForRank(entry.rank, totalManagers, loserPlaces, punishmentTexts);

        return (
          <div
            key={entry.userId}
            className={`relative flex flex-col items-center rounded-2xl border ${style.border} bg-zinc-900 shadow-lg overflow-hidden transition-transform hover:-translate-y-1 ${
              isFirst ? "w-56 pb-6 pt-8" : "w-48 pb-5 pt-7"
            }`}
          >
            {/* Top accent bar */}
            <div className={`absolute inset-x-0 top-0 h-1.5 ${style.accentBar}`} />

            {/* Rank chip */}
            <div
              className={`absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold shadow ${style.chip}`}
            >
              {style.icon}
              {style.label}
            </div>

            <div className="px-4 flex flex-col items-center w-full">
              <Avatar name={entry.name} avatarUrl={entry.avatarUrl} size={isFirst ? "xl" : "lg"} />

              <div className="mt-3 text-center w-full">
                <p className="font-semibold text-white text-sm truncate" title={entry.name}>
                  {entry.name}
                </p>
                <p className={`${isFirst ? "text-3xl" : "text-2xl"} font-black mt-1 ${style.score}`}>
                  {entry.totalScoreVal.toFixed(1)}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-zinc-500 mt-0.5">points</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 w-full text-center">
                <div className="rounded-lg bg-zinc-800 px-2 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">Delivered</p>
                  <p className="text-sm font-bold text-zinc-100">{entry.deliveredTotal}</p>
                </div>
                <div className="rounded-lg bg-zinc-800 px-2 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">Stock</p>
                  <p className="text-sm font-bold text-zinc-100">{entry.stockQty}</p>
                </div>
              </div>

              {rw && (
                <div className={`mt-3 w-full rounded-lg px-2 py-1.5 text-center ${style.rewardChip}`}>
                  <p className="text-xs font-bold tracking-wide">{rw}</p>
                </div>
              )}

              {pun && (
                <div className="mt-2 w-full rounded-lg bg-brand text-white px-2 py-1.5 text-center brand-keep">
                  <p className="text-xs font-bold">{pun}</p>
                </div>
              )}

              {entry.note && (
                <div className="mt-2 w-full rounded-lg bg-brand/10 border border-brand/30 px-2 py-1 text-center">
                  <p className="text-xs text-brand italic truncate" title={entry.note}>
                    &quot;{entry.note}&quot;
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
