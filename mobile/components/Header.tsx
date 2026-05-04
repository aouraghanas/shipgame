import { Text, View } from "react-native";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-5">
      <Text className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">{title}</Text>
      {subtitle && (
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</Text>
      )}
    </View>
  );
}
