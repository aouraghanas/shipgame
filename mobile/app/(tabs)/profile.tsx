import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Moon, Sun, LogOut, Languages, Bell } from "lucide-react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { useT, useI18n } from "@/lib/i18n-context";
import { useTheme } from "@/lib/theme-context";

export default function ProfileScreen() {
  const t = useT();
  const { user, signOut } = useAuth();
  const { mode, setMode, tokens } = useTheme();
  const { locale, setLocale } = useI18n();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  async function handleSignOut() {
    Alert.alert(t("profile.signOut"), t("profile.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.signOut"),
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  }

  async function enablePush() {
    setPushBusy(true);
    try {
      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;
      if (status !== "granted") {
        const r = await Notifications.requestPermissionsAsync();
        status = r.status;
      }
      setPushEnabled(status === "granted");
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Header title={t("profile.title")} />

        <Card className="flex-row items-center gap-3 mb-5">
          <View className="h-12 w-12 rounded-full bg-brand items-center justify-center">
            <Text className="text-lg font-bold text-white">
              {(user?.name ?? "?").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              {user?.name ?? "—"}
            </Text>
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              {user?.email ?? ""} · {user?.role ?? ""}
            </Text>
          </View>
        </Card>

        <SectionLabel label={t("profile.theme")} />
        <View className="flex-row gap-2 mb-5">
          <ThemeButton
            active={mode === "dark"}
            onPress={() => setMode("dark")}
            icon={<Moon size={16} color={mode === "dark" ? "#fff" : tokens.text} />}
            label={t("profile.theme.dark")}
          />
          <ThemeButton
            active={mode === "light"}
            onPress={() => setMode("light")}
            icon={<Sun size={16} color={mode === "light" ? "#fff" : tokens.text} />}
            label={t("profile.theme.light")}
          />
        </View>

        <SectionLabel label={t("profile.language")} />
        <View className="flex-row gap-2 mb-1">
          <ThemeButton
            active={locale === "en"}
            onPress={() => setLocale("en")}
            icon={<Languages size={16} color={locale === "en" ? "#fff" : tokens.text} />}
            label="English"
          />
          <ThemeButton
            active={locale === "ar"}
            onPress={() => setLocale("ar")}
            icon={<Languages size={16} color={locale === "ar" ? "#fff" : tokens.text} />}
            label="العربية"
          />
        </View>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 mt-1.5">
          {t("profile.restartHint")}
        </Text>

        <SectionLabel label={t("profile.notifications")} />
        <Card className="mb-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1">
              <Bell size={18} color={tokens.brand} />
              <Text className="text-sm text-zinc-700 dark:text-zinc-200">
                {pushEnabled ? t("profile.notifications.enabled") : t("profile.notifications.enable")}
              </Text>
            </View>
            {!pushEnabled && (
              <Button title="Enable" size="sm" onPress={enablePush} loading={pushBusy} />
            )}
          </View>
        </Card>

        <SectionLabel label={t("profile.about")} />
        <Card className="mb-6">
          <View className="flex-row justify-between">
            <Text className="text-sm text-zinc-700 dark:text-zinc-200">
              {t("profile.version")}
            </Text>
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              {Constants.expoConfig?.version ?? "0.1.0"}
            </Text>
          </View>
        </Card>

        <Pressable
          onPress={handleSignOut}
          className="rounded-xl border border-red-500/30 bg-red-500/10 py-3.5 flex-row items-center justify-center gap-2"
        >
          <LogOut size={18} color="#dc2626" />
          <Text className="text-red-600 font-bold">{t("profile.signOut")}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="text-xs uppercase font-bold tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">
      {label}
    </Text>
  );
}

function ThemeButton({
  active,
  onPress,
  icon,
  label,
}: {
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 border ${
        active
          ? "bg-brand border-brand"
          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {icon}
      <Text
        className={`text-sm font-semibold ${
          active ? "text-white" : "text-zinc-700 dark:text-zinc-200"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
