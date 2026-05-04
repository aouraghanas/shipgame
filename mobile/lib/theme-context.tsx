import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { colorScheme as nwColorScheme } from "nativewind";
import { themes, type ThemeMode, type ThemeTokens } from "./theme";
import { prefs } from "./storage";

const STORAGE_KEY = "ui-theme";

interface Ctx {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => Promise<void>;
  toggle: () => Promise<void>;
  tokens: ThemeTokens;
}

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    (async () => {
      try {
        const saved = (await prefs.get(STORAGE_KEY)) as ThemeMode | null;
        const initial = saved === "light" || saved === "dark" ? saved : "dark";
        setModeState(initial);
        nwColorScheme.set(initial);
      } catch {}
    })();
  }, []);

  const setMode = useCallback(async (m: ThemeMode) => {
    setModeState(m);
    nwColorScheme.set(m);
    await prefs.set(STORAGE_KEY, m);
  }, []);

  const toggle = useCallback(async () => {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    await setMode(next);
  }, [mode, setMode]);

  const value = useMemo<Ctx>(
    () => ({ mode, setMode, toggle, tokens: themes[mode] }),
    [mode, setMode, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
