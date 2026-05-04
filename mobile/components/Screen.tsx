import { View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme-context";

interface Props extends ViewProps {
  /** Default true. Disable for full-bleed screens. */
  safeArea?: boolean;
  /** Default true. Disable for screens that need their own scrollview. */
  padded?: boolean;
}

export function Screen({
  safeArea = true,
  padded = true,
  className = "",
  style,
  children,
  ...rest
}: Props) {
  const { tokens } = useTheme();
  const Wrapper = safeArea ? SafeAreaView : View;
  const padding = padded ? "px-5 pt-4 pb-2" : "";
  return (
    <Wrapper
      style={[{ flex: 1, backgroundColor: tokens.background }, style]}
      edges={safeArea ? ["top", "left", "right"] : undefined}
    >
      <View className={`flex-1 ${padding} ${className}`} {...rest}>
        {children}
      </View>
    </Wrapper>
  );
}
