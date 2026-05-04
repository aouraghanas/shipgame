import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { useT } from "@/lib/i18n-context";
import { useTheme } from "@/lib/theme-context";
import { api } from "@/lib/api";
import type { TicketDetail, TicketStatus } from "@/lib/types";

const STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED"];

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const { tokens, mode } = useTheme();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const ticket = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => api<TicketDetail>(`/api/tickets/${id}`),
    enabled: Boolean(id),
  });

  const addComment = useMutation({
    mutationFn: (body: string) =>
      api(`/api/tickets/${id}/comments`, { method: "POST", body: { body } }),
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["ticket", id] });
    },
  });

  const changeStatus = useMutation({
    mutationFn: (status: TicketStatus) =>
      api(`/api/tickets/${id}`, { method: "PATCH", body: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", id] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["tickets-summary"] });
    },
  });

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center gap-2 px-3 py-3">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full"
        >
          <ChevronLeft size={22} color={tokens.text} />
        </Pressable>
        <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex-1" numberOfLines={1}>
          {ticket.data?.title ?? t("common.loading")}
        </Text>
      </View>

      {ticket.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={tokens.brand} />
        </View>
      ) : !ticket.data ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-zinc-500 dark:text-zinc-400">{t("common.error")}</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 16 }}>
            {/* Meta */}
            <Card>
              <View className="flex-row gap-2 flex-wrap">
                <StatusBadge
                  status={ticket.data.status}
                  label={t(`status.${ticket.data.status}`)}
                />
                <PriorityBadge
                  priority={ticket.data.priority}
                  label={t(`priority.${ticket.data.priority}`)}
                />
              </View>
              <Text className="mt-3 text-base text-zinc-800 dark:text-zinc-100">
                {ticket.data.description}
              </Text>
              <View className="mt-3 gap-1">
                <MetaRow
                  label={t("tickets.detail.seller")}
                  value={ticket.data.seller?.name ?? ticket.data.sellerNameText ?? "—"}
                />
                <MetaRow
                  label={t("tickets.detail.assignee")}
                  value={ticket.data.assignee?.name ?? "—"}
                />
                <MetaRow
                  label={t("tickets.detail.created")}
                  value={`${new Date(ticket.data.createdAt).toLocaleDateString()} · ${ticket.data.createdBy.name}`}
                />
              </View>
            </Card>

            {/* Status changer */}
            <Card>
              <Text className="text-sm font-bold text-zinc-700 dark:text-zinc-200 mb-2">
                {t("tickets.detail.changeStatus")}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {STATUSES.map((s) => {
                  const active = ticket.data!.status === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => changeStatus.mutate(s)}
                      disabled={changeStatus.isPending}
                      className={`px-3 py-1.5 rounded-full border ${
                        active
                          ? "bg-brand border-brand"
                          : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          active ? "text-white" : "text-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        {t(`status.${s}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* Comments */}
            <Card>
              <Text className="text-sm font-bold text-zinc-700 dark:text-zinc-200 mb-2">
                {t("tickets.detail.commentsTitle")} ({ticket.data.comments.length})
              </Text>
              <View className="gap-3">
                {ticket.data.comments.map((c) => (
                  <View key={c.id} className="border-l-2 border-brand/50 pl-3">
                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                      {c.user.name} · {new Date(c.createdAt).toLocaleString()}
                    </Text>
                    <Text className="text-sm text-zinc-800 dark:text-zinc-100 mt-0.5">
                      {c.body}
                    </Text>
                  </View>
                ))}
                {ticket.data.comments.length === 0 && (
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t("common.empty")}
                  </Text>
                )}
              </View>

              <View className="mt-4 gap-2">
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder={t("tickets.detail.addComment")}
                  placeholderTextColor={mode === "dark" ? "#52525b" : "#9ca3af"}
                  multiline
                  style={{
                    color: tokens.text,
                    backgroundColor: mode === "dark" ? "#18181b" : "#f4f5fa",
                    borderColor: tokens.border,
                    minHeight: 70,
                    padding: 12,
                  }}
                  className="rounded-lg border text-sm"
                />
                <Button
                  title={addComment.isPending ? t("common.sending") : t("common.send")}
                  loading={addComment.isPending}
                  onPress={() => comment.trim() && addComment.mutate(comment.trim())}
                  disabled={!comment.trim()}
                  size="md"
                />
              </View>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold w-20">{label}</Text>
      <Text className="text-xs text-zinc-700 dark:text-zinc-200 flex-1">{value}</Text>
    </View>
  );
}
