import { ScrollView, Text, View, Pressable, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ticket, Trophy, AlertTriangle } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n-context";
import { useTheme } from "@/lib/theme-context";
import { api } from "@/lib/api";
import type { TicketSummary, TicketRow } from "@/lib/types";
import { canSeeLeaderboard } from "@/lib/access";

export default function HomeScreen() {
  const { user } = useAuth();
  const t = useT();
  const { tokens } = useTheme();

  const summary = useQuery({
    queryKey: ["tickets-summary"],
    queryFn: () => api<TicketSummary>("/api/tickets/summary"),
    refetchOnWindowFocus: false,
  });

  const recent = useQuery({
    queryKey: ["tickets", "recent"],
    queryFn: () =>
      api<TicketRow[]>("/api/tickets?take=5"),
    refetchOnWindowFocus: false,
  });

  const urgentCount =
    recent.data?.filter((r) => r.priority === "URGENT" && r.status !== "RESOLVED" && r.status !== "ARCHIVED").length ?? 0;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={summary.isRefetching || recent.isRefetching}
            onRefresh={() => {
              summary.refetch();
              recent.refetch();
            }}
            tintColor={tokens.brand}
          />
        }
      >
        <Header
          title={t("home.welcome") + (user?.name ? `, ${user.name.split(" ")[0]}` : "")}
        />

        <View className="flex-row gap-3 mb-5">
          <StatCard
            label={t("home.activeTickets")}
            value={summary.data?.openPipeline ?? 0}
            icon={<Ticket size={20} color={tokens.brand} />}
            onPress={() => router.push("/(tabs)/tickets")}
          />
          <StatCard
            label={t("home.urgentTickets")}
            value={urgentCount}
            icon={<AlertTriangle size={20} color="#dc2626" />}
            onPress={() => router.push("/(tabs)/tickets")}
            danger
          />
        </View>

        <Header title={t("home.openTickets")} />
        <View className="gap-2">
          {recent.data?.slice(0, 5).map((ticket) => (
            <Pressable
              key={ticket.id}
              onPress={() => router.push(`/tickets/${ticket.id}`)}
            >
              <Card>
                <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100" numberOfLines={1}>
                  {ticket.title}
                </Text>
                <View className="flex-row gap-2 mt-1.5">
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t(`status.${ticket.status}`)} · {t(`priority.${ticket.priority}`)}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))}
          {recent.data?.length === 0 && (
            <Text className="text-zinc-500 dark:text-zinc-400 text-sm py-3 text-center">
              {t("tickets.empty")}
            </Text>
          )}
        </View>

        <View className="mt-7">
          <Header title={t("home.quickAccess")} />
          <View className="flex-row gap-3">
            <QuickLink
              icon={<Ticket size={22} color={tokens.brand} />}
              label={t("home.tickets")}
              onPress={() => router.push("/(tabs)/tickets")}
            />
            {canSeeLeaderboard(user?.role ?? null) && (
              <QuickLink
                icon={<Trophy size={22} color="#f59e0b" />}
                label={t("home.leaderboard")}
                onPress={() => router.push("/(tabs)/leaderboard")}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function StatCard({
  label,
  value,
  icon,
  onPress,
  danger,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} className="flex-1">
      <View
        className={`rounded-2xl border p-4 ${
          danger
            ? "border-red-500/30 bg-red-500/10"
            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        }`}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-xs uppercase font-bold text-zinc-500 dark:text-zinc-400">
            {label}
          </Text>
          {icon}
        </View>
        <Text className="mt-2 text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

function QuickLink({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-1">
      <View className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4 items-center gap-2">
        {icon}
        <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
