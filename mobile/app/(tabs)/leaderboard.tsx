import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal, Award } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { useT } from "@/lib/i18n-context";
import { useTheme } from "@/lib/theme-context";
import { api } from "@/lib/api";
import type { LeaderboardData, LeaderboardEntry } from "@/lib/types";

const PODIUM = [
  { tone: "amber-500", icon: Trophy, key: "leaderboard.1st" },
  { tone: "slate-500", icon: Medal, key: "leaderboard.2nd" },
  { tone: "amber-700", icon: Award, key: "leaderboard.3rd" },
];

export default function LeaderboardScreen() {
  const t = useT();
  const { tokens } = useTheme();
  const board = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => api<LeaderboardData>("/api/leaderboard"),
  });

  const entries = board.data?.entries ?? [];

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={board.isRefetching}
            onRefresh={() => board.refetch()}
            tintColor={tokens.brand}
          />
        }
      >
        <Header title={t("leaderboard.title")} subtitle={t("leaderboard.subtitle")} />

        {board.isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color={tokens.brand} />
          </View>
        ) : entries.length === 0 ? (
          <EmptyState message={t("leaderboard.empty")} />
        ) : (
          <View className="gap-2">
            {entries.slice(0, 3).map((e, i) => (
              <PodiumCard key={e.userId} entry={e} index={i} t={t} />
            ))}
            {entries.slice(3).map((e) => (
              <RankRow key={e.userId} entry={e} t={t} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function PodiumCard({
  entry,
  index,
  t,
}: {
  entry: LeaderboardEntry;
  index: number;
  t: (k: string) => string;
}) {
  const meta = PODIUM[index];
  const Icon = meta.icon;
  const accent =
    index === 0 ? "#f59e0b" : index === 1 ? "#64748b" : "#a16207";
  return (
    <Card className="flex-row items-center gap-3">
      <View
        style={{ backgroundColor: accent }}
        className="h-11 w-11 rounded-xl items-center justify-center"
      >
        <Icon size={20} color="white" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-zinc-900 dark:text-zinc-50" numberOfLines={1}>
          {entry.name}
        </Text>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          {t(meta.key)} · {t("leaderboard.delivered")} {entry.deliveredTotal} · {t("leaderboard.stock")} {entry.stockQty}
        </Text>
      </View>
      <Text style={{ color: accent }} className="text-2xl font-extrabold">
        {entry.totalScoreVal.toFixed(1)}
      </Text>
    </Card>
  );
}

function RankRow({
  entry,
  t,
}: {
  entry: LeaderboardEntry;
  t: (k: string) => string;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <Text className="w-6 text-center font-bold text-zinc-500 dark:text-zinc-400 text-sm">
        {entry.rank}
      </Text>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100" numberOfLines={1}>
          {entry.name}
        </Text>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          {t("leaderboard.delivered")} {entry.deliveredTotal} · {t("leaderboard.stock")} {entry.stockQty}
        </Text>
      </View>
      <Text className="text-base font-extrabold text-brand">{entry.totalScoreVal.toFixed(1)}</Text>
    </View>
  );
}
