import { View, type ViewProps } from "react-native";

export function Card({ className = "", ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4 ${className}`}
      {...rest}
    />
  );
}
