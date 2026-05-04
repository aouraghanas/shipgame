import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth-context";

/**
 * Routes a fresh app launch:
 * - while loading the cached session: spinner
 * - if signed in: tabs
 * - else: login
 */
export default function Index() {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#a31d2a" />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)/home" />;
}
