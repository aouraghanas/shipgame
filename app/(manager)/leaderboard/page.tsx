import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";

export default function LeaderboardPage() {
  return (
    <div>
      <LeaderboardView autoRefresh refreshInterval={15000} />
    </div>
  );
}
