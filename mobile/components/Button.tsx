import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "sm";

interface Props extends Omit<PressableProps, "children"> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const containerByVariant: Record<Variant, string> = {
  primary: "bg-brand active:opacity-80",
  secondary: "bg-zinc-200 dark:bg-zinc-800 active:opacity-80",
  ghost: "bg-transparent active:opacity-60",
  danger: "bg-red-600 active:opacity-80",
};

const textByVariant: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-zinc-900 dark:text-zinc-100",
  ghost: "text-brand",
  danger: "text-white",
};

const sizeBox: Record<Size, string> = {
  sm: "px-3 py-2 rounded-md",
  md: "px-4 py-3 rounded-lg",
  lg: "px-5 py-4 rounded-xl",
};
const sizeText: Record<Size, string> = {
  sm: "text-sm font-semibold",
  md: "text-base font-semibold",
  lg: "text-base font-bold",
};

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`${containerByVariant[variant]} ${sizeBox[size]} flex-row items-center justify-center gap-2 ${
        fullWidth ? "w-full" : ""
      } ${isDisabled ? "opacity-50" : ""}`}
      {...rest}
    >
      {loading && (
        <ActivityIndicator color={variant === "primary" || variant === "danger" ? "#fff" : "#a31d2a"} />
      )}
      <Text className={`${textByVariant[variant]} ${sizeText[size]}`}>{title}</Text>
    </Pressable>
  );
}
