/**
 * Theme tokens shared between both modes. NativeWind handles class-based
 * dark mode but a few raw colors (StatusBar, system UI background) need
 * concrete values.
 */

export const themes = {
  dark: {
    background: "#09090b",
    surface: "#18181b",
    surfaceMuted: "#27272a",
    border: "#27272a",
    text: "#fafafa",
    textMuted: "#a1a1aa",
    brand: "#a31d2a",
  },
  light: {
    background: "#f4f5fa",
    surface: "#ffffff",
    surfaceMuted: "#f4f5fa",
    border: "#e6e7ee",
    text: "#2f2b3d",
    textMuted: "#6b7280",
    brand: "#a31d2a",
  },
} as const;

export type ThemeMode = "dark" | "light";
export type ThemeTokens = (typeof themes)[ThemeMode];
