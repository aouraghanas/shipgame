import { Avatar } from "@/components/shared/Avatar";
import { Trophy, Medal } from "lucide-react";
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

const medals = [
  { label: "1st", color: "from-amber-500/30 to-amber-900/20 border-amber-500", text: "text-amber-400", icon: <Trophy className="h-5 w-5 text-amber-400" /> },
  { label: "2nd", color: "from-slate-400/20 to-slate-700/20 border-slate-400", text: "text-slate-300", icon: <Medal className="h-5 w-5 text-slate-300" /> },
  { label: "3rd", color: "from-amber-700/20 to-amber-900/20 border-amber-700", text: "text-amber-600", icon: <Medal className="h-5 w-5 text-amber-600" /> },
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
        const medal = medals[idx];
        const isFirst = idx === 0;
        const rw = rewardTextForRank(entry.rank, winnerPlaces, rewardTexts);
        const pun = punishmentTextForRank(entry.rank, totalManagers, loserPlaces, punishmentTexts);

        return (
          <div
            key={entry.userId}
            className={`relative flex flex-col items-center rounded-2xl border bg-gradient-to-b ${medal.color} p-5 transition-transform hover:-translate-y-1 ${isFirst ? "w-52 pb-8 pt-7 shadow-lg shadow-amber-500/10 animate-pulse_gold" : "w-44"}`}
          >
            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border ${medal.color.split(" ").find((c) => c.startsWith("border-"))} bg-zinc-950 px-2.5 py-0.5 text-xs font-bold ${medal.text}`}>
              {medal.icon}
              {medal.label}
            </div>

            <Avatar name={entry.name} avatarUrl={entry.avatarUrl} size={isFirst ? "xl" : "lg"} />

            <div className="mt-3 text-center">
              <p className="font-bold text-white text-sm">{entry.name}</p>
              <p className={`text-2xl font-black mt-1 ${medal.text}`}>
                {entry.totalScoreVal.toFixed(1)}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">points</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 w-full text-center">
              <div className="rounded-lg bg-zinc-900/60 p-1.5">
                <p className="text-xs text-zinc-400">Delivered</p>
                <p className="text-sm font-semibold text-zinc-100">{entry.deliveredTotal}</p>
              </div>
              <div className="rounded-lg bg-zinc-900/60 p-1.5">
                <p className="text-xs text-zinc-400">Stock</p>
                <p className="text-sm font-semibold text-zinc-100">{entry.stockQty}</p>
              </div>
            </div>

            {rw && (
              <div className="mt-3 w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-center">
                <p className="text-xs font-semibold text-amber-400">{rw}</p>
              </div>
            )}

            {pun && (
              <div className="mt-2 w-full rounded-lg border border-red-500/40 bg-red-950/40 px-2 py-1.5 text-center">
                <p className="text-xs font-semibold text-red-400">{pun}</p>
              </div>
            )}

            {entry.note && (
              <div className="mt-2 w-full rounded-lg bg-indigo-500/10 border border-indigo-500/30 px-2 py-1 text-center">
                <p className="text-xs text-indigo-300 italic">&quot;{entry.note}&quot;</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
