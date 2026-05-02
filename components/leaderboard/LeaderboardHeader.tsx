"use client";

import { Trophy } from "lucide-react";
import { useT } from "@/components/shared/I18nProvider";

export function LeaderboardHeader() {
  const t = useT();
  return (
    <div className="flex items-center gap-3 mb-8">
      <Trophy className="h-8 w-8 text-amber-400" />
      <div>
        <h1 className="text-3xl font-bold text-white">{t("leaderboard.title")}</h1>
        <p className="text-zinc-400 mt-0.5">{t("leaderboard.subtitle")}</p>
      </div>
    </div>
  );
}
