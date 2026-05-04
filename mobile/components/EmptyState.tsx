import { Text, View } from "react-native";
import { Inbox } from "lucide-react-native";

export function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <View className="items-center justify-center py-16">
      <Inbox size={32} color="#a1a1aa" />
      <Text className="mt-3 text-zinc-500 dark:text-zinc-400 text-base text-center">{message}</Text>
      {hint && <Text className="mt-1 text-zinc-500 dark:text-zinc-500 text-xs text-center">{hint}</Text>}
    </View>
  );
}
