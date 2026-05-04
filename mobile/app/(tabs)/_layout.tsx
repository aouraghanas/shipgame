import { Tabs } from "expo-router";
import { Home, Ticket, Trophy, User } from "lucide-react-native";
import { useTheme } from "@/lib/theme-context";
import { useT } from "@/lib/i18n-context";
import { useAuth } from "@/lib/auth-context";
import { canSeeLeaderboard } from "@/lib/access";

export default function TabsLayout() {
  const { tokens, mode } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const showLeaderboard = canSeeLeaderboard(user?.role ?? null);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.brand,
        tabBarInactiveTintColor: mode === "dark" ? "#71717a" : "#9ca3af",
        tabBarStyle: {
          backgroundColor: tokens.surface,
          borderTopColor: tokens.border,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: t("tabs.tickets"),
          tabBarIcon: ({ color, size }) => <Ticket size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: t("tabs.leaderboard"),
          tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} />,
          href: showLeaderboard ? "/leaderboard" : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
