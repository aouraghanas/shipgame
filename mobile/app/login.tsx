import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ship, Languages } from "lucide-react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/lib/auth-context";
import { useT, useI18n } from "@/lib/i18n-context";
import { useTheme } from "@/lib/theme-context";
import { ApiError } from "@/lib/api";
import { homeRouteFor } from "@/lib/access";

export default function LoginScreen() {
  const t = useT();
  const { locale, setLocale } = useI18n();
  const { tokens, mode } = useTheme();
  const { signIn, unlockWithBiometrics } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Try biometric unlock if a token already exists.
  useEffect(() => {
    (async () => {
      const ok = await unlockWithBiometrics();
      if (ok) router.replace("/(tabs)/home");
    })();
  }, [unlockWithBiometrics]);

  async function onSubmit() {
    setLoading(true);
    setErr(null);
    try {
      const u = await signIn(email, password);
      router.replace(homeRouteFor(u.role) as never);
    } catch (e) {
      if (e instanceof ApiError) setErr(e.message);
      else setErr(t("login.invalid"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen safeArea padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top-right language toggle */}
          <View className="absolute top-4 right-4 z-10">
            <Pressable
              onPress={() => setLocale(locale === "en" ? "ar" : "en")}
              className="flex-row items-center gap-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 px-3 py-1.5"
            >
              <Languages size={14} color={tokens.text} />
              <Text className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {locale === "en" ? "AR" : "EN"}
              </Text>
            </Pressable>
          </View>

          <View className="items-center mb-10">
            <View className="h-16 w-16 rounded-2xl bg-brand items-center justify-center shadow-lg">
              <Ship size={28} color="white" />
            </View>
            <Text className="mt-5 text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              SHIP<Text className="text-brand">EH</Text>
            </Text>
            <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("login.subtitle")}</Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">
                {t("login.email")}
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t("login.emailPlaceholder")}
                placeholderTextColor={mode === "dark" ? "#52525b" : "#9ca3af"}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                inputMode="email"
                style={{
                  color: tokens.text,
                  backgroundColor: mode === "dark" ? "#18181b" : "#ffffff",
                  borderColor: tokens.border,
                }}
                className="h-12 px-4 rounded-lg border text-base"
              />
            </View>
            <View>
              <Text className="text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">
                {t("login.password")}
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={mode === "dark" ? "#52525b" : "#9ca3af"}
                secureTextEntry
                style={{
                  color: tokens.text,
                  backgroundColor: mode === "dark" ? "#18181b" : "#ffffff",
                  borderColor: tokens.border,
                }}
                className="h-12 px-4 rounded-lg border text-base"
              />
            </View>

            {err && (
              <Text className="text-sm text-red-500 text-center">{err}</Text>
            )}

            <Button
              title={loading ? t("login.signingIn") : t("login.submit")}
              onPress={onSubmit}
              loading={loading}
              size="lg"
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
