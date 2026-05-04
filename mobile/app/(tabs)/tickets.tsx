import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { useT } from "@/lib/i18n-context";
import { useTheme } from "@/lib/theme-context";
import { api } from "@/lib/api";
import type { TicketRow, TicketStatus } from "@/lib/types";

const FILTERS: { key: string; status?: TicketStatus }[] = [
  { key: "tickets.filters.all" },
  { key: "tickets.filters.open", status: "OPEN" },
  { key: "tickets.filters.inProgress", status: "IN_PROGRESS" },
  { key: "tickets.filters.waiting", status: "WAITING" },
  { key: "tickets.filters.resolved", status: "RESOLVED" },
];

export default function TicketsScreen() {
  const t = useT();
  const { tokens } = useTheme();
  const [filter, setFilter] = useState<TicketStatus | undefined>(undefined);

  const tickets = useQuery({
    queryKey: ["tickets", { status: filter ?? "ALL" }],
    queryFn: () =>
      api<TicketRow[]>(
        `/api/tickets?take=80${filter ? `&status=${filter}` : ""}`
      ),
  });

  const items = useMemo(() => tickets.data ?? [], [tickets.data]);

  return (
    <Screen padded={false}>
      <View className="px-5 pt-4">
        <Header title={t("tickets.title")} subtitle={t("tickets.queue")} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 8 }}
      >
        {FILTERS.map((f) => {
          const active = (f.status ?? null) === (filter ?? null);
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.status)}
              className={`px-4 py-2 rounded-full border ${
                active
                  ? "bg-brand border-brand"
                  : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  active ? "text-white" : "text-zinc-700 dark:text-zinc-200"
                }`}
              >
                {t(f.key)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {tickets.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={tokens.brand} />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 px-5">
          <EmptyState message={t("tickets.empty")} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={tickets.isRefetching}
              onRefresh={() => tickets.refetch()}
              tintColor={tokens.brand}
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/tickets/${item.id}`)}>
              <Card
                className={
                  item.priority === "URGENT"
                    ? "border-l-4 border-l-brand"
                    : item.priority === "HIGH"
                      ? "border-l-4 border-l-amber-500"
                      : ""
                }
              >
                <View className="flex-row justify-between items-start gap-2">
                  <Text
                    className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex-1"
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <StatusBadge status={item.status} label={t(`status.${item.status}`)} />
                </View>
                <View className="flex-row gap-2 mt-2.5 flex-wrap">
                  <PriorityBadge priority={item.priority} label={t(`priority.${item.priority}`)} />
                  {item.seller?.name && (
                    <View className="bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 py-1">
                      <Text className="text-xs text-zinc-600 dark:text-zinc-300">
                        {item.seller.name}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  {new Date(item.createdAt).toLocaleDateString()} · {item._count.comments} comments
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
