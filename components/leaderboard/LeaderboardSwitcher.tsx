"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { LeaderboardView } from "./LeaderboardView";
import { ConfirmationLeaderboard } from "@/components/confirmation/ConfirmationLeaderboard";
import { useT } from "@/components/shared/I18nProvider";
import { Users, Headphones } from "lucide-react";

type Board = "managers" | "callCenter";

/**
 * Leaderboard page wrapper. Admins get a toggle to switch between the account
 * managers board and the call-center (confirmation agents) board. Everyone
 * else keeps the standard account-managers board.
 */
export function LeaderboardSwitcher({
  autoRefresh = false,
  refreshInterval = 15000,
}: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const { data: session } = useSession();
  const t = useT();
  const isAdmin = session?.user?.role === "ADMIN";
  const [board, setBoard] = useState<Board>("managers");

  if (!isAdmin) {
    return <LeaderboardView autoRefresh={autoRefresh} refreshInterval={refreshInterval} />;
  }

  const tabs: { id: Board; label: string; icon: typeof Users }[] = [
    { id: "managers", label: t("leaderboard.tab.managers"), icon: Users },
    { id: "callCenter", label: t("leaderboard.tab.callCenter"), icon: Headphones },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex gap-1 rounded-lg bg-zinc-900 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setBoard(id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                board === id
                  ? "brand-keep bg-brand text-white"
                  : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {board === "managers" ? (
        <LeaderboardView autoRefresh={autoRefresh} refreshInterval={refreshInterval} />
      ) : (
        <ConfirmationLeaderboard autoRefresh={autoRefresh} refreshInterval={refreshInterval} />
      )}
    </div>
  );
}
