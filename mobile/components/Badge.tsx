import { View, Text } from "react-native";

interface Props {
  label: string;
  /** Tailwind color class for the bg + text accent (e.g. "bg-emerald-500/15"). */
  tone?: "neutral" | "emerald" | "amber" | "rose" | "sky" | "brand" | "slate";
  size?: "sm" | "xs";
}

const toneClasses: Record<NonNullable<Props["tone"]>, { bg: string; text: string }> = {
  neutral: { bg: "bg-zinc-200 dark:bg-zinc-800", text: "text-zinc-700 dark:text-zinc-200" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300" },
  rose: { bg: "bg-rose-500/15", text: "text-rose-700 dark:text-rose-300" },
  sky: { bg: "bg-sky-500/15", text: "text-sky-700 dark:text-sky-300" },
  brand: { bg: "bg-brand/15", text: "text-brand" },
  slate: { bg: "bg-slate-500/15", text: "text-slate-700 dark:text-slate-300" },
};

export function Badge({ label, tone = "neutral", size = "sm" }: Props) {
  const c = toneClasses[tone];
  const px = size === "xs" ? "px-1.5 py-0.5" : "px-2 py-1";
  const fs = size === "xs" ? "text-[10px]" : "text-xs";
  return (
    <View className={`${c.bg} ${px} rounded-full self-start`}>
      <Text className={`${c.text} ${fs} font-semibold`}>{label}</Text>
    </View>
  );
}
