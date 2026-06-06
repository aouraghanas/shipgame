import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { AuthProvider } from "@/lib/auth-context";
import { I18nProvider } from "@/lib/i18n-context";
import { ThemeProvider, useTheme } from "@/lib/theme-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
  }),
});

function ThemedStack() {
  const { mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: mode === "dark" ? "#09090b" : "#f4f5fa" },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Channel setup for Android — no-op on iOS.
    Notifications.setNotificationChannelAsync?.("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#a31d2a",
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // When the user taps a push, deep-link to the screen it points at.
    function handleLink(data: unknown) {
      const link = (data as { link?: string } | null)?.link;
      try {
        if (typeof link === "string" && link.startsWith("/")) {
          router.push(link as never);
        } else {
          router.push("/notifications" as never);
        }
      } catch {}
    }

    // App opened from a notification (cold start).
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => {
        if (resp) handleLink(resp.notification.request.content.data);
      })
      .catch(() => {});

    // Tapped while app is running.
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      handleLink(resp.notification.request.content.data);
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <I18nProvider>
              <AuthProvider>
                <ThemedStack />
              </AuthProvider>
            </I18nProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
