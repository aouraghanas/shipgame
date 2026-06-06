import { LeaderboardSwitcher } from "@/components/leaderboard/LeaderboardSwitcher";

export default function LeaderboardPage() {
  return (
    <div>
      <LeaderboardSwitcher autoRefresh refreshInterval={15000} />
    </div>
  );
}
