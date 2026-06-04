import { ConfirmationLeaderboard } from "@/components/confirmation/ConfirmationLeaderboard";

export default function ConfirmationScreenPage() {
  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <ConfirmationLeaderboard screen autoRefresh refreshInterval={10000} />
    </div>
  );
}
