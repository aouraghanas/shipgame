import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { useT } from "@/lib/i18n-context";
import { useTheme } from "@/lib/theme-context";
import { api } from "@/lib/api";
import type { NotificationsResponse } from "@/lib/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
}

export default function NotificationsScreen() {
  const t = useT();
  const { tokens } = useTheme();
  const qc = useQueryClient();

  const notifs = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<NotificationsResponse>("/api/me/notifications?take=50"),
  });

  // Refresh whenever the tab regains focus (e.g. after tapping a push).
  useFocusEffect(
    useCallback(() => {
      void notifs.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const items = notifs.data?.items ?? [];
  const unread = notifs.data?.unread ?? 0;

  async function markAllRead() {
    await api("/api/me/notifications/mark-read", {
      method: "POST",
      body: { all: true },
    }).catch(() => {});
    void notifs.refetch();
    void qc.invalidateQueries({ queryKey: ["notifications-count"] });
  }

  async function open(id: string, link: string | null) {
    await api("/api/me/notifications/mark-read", {
      method: "POST",
      body: { ids: [id] },
    }).catch(() => {});
    void notifs.refetch();
    if (link && link.startsWith("/")) {
      try {
        router.push(link as never);
      } catch {}
    }
  }

  return (
    <Screen padded={false}>
      <View className="px-5 pt-4 flex-row items-center justify-between">
        <Header title={t("notif.title")} />
        {unread > 0 && (
          <Pressable onPress={markAllRead} className="mb-5">
            <Text className="text-xs font-semibold text-brand">{t("notif.markAllRead")}</Text>
          </Pressable>
        )}
      </View>

      {notifs.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={tokens.brand} />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 px-5">
          <EmptyState message={t("notif.empty")} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={notifs.isRefetching}
              onRefresh={() => notifs.refetch()}
              tintColor={tokens.brand}
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => open(item.id, item.link)}>
              <Card className={item.readAt ? "" : "border-l-4 border-l-brand"}>
                <View className="flex-row items-start justify-between gap-2">
                  <Text
                    className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex-1"
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  {!item.readAt && <View className="mt-1.5 h-2 w-2 rounded-full bg-brand" />}
                </View>
                {item.body && (
                  <Text className="text-sm text-zinc-600 dark:text-zinc-300 mt-1" numberOfLines={3}>
                    {item.body}
                  </Text>
                )}
                <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  {timeAgo(item.createdAt)}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
