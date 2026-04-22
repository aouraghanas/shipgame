import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";
import { Trophy } from "lucide-react";

export default function LeaderboardPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="h-8 w-8 text-amber-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          <p className="text-zinc-400 mt-0.5">Current month rankings</p>
        </div>
      </div>
      <LeaderboardView />
    </div>
  );
}
