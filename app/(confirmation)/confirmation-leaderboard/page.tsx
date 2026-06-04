import { ConfirmationLeaderboard } from "@/components/confirmation/ConfirmationLeaderboard";

export default function ConfirmationLeaderboardPage() {
  return <ConfirmationLeaderboard autoRefresh refreshInterval={15000} />;
}
