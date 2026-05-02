import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";
import { LeaderboardHeader } from "@/components/leaderboard/LeaderboardHeader";

export default function LeaderboardPage() {
  return (
    <div>
      <LeaderboardHeader />
      <LeaderboardView autoRefresh refreshInterval={15000} />
    </div>
  );
}
