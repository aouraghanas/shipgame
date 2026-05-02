"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useT } from "./I18nProvider";

type ThemeMode = "dark" | "light";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("theme-light", mode === "light");
  try {
    localStorage.setItem("ui-theme-mode", mode);
  } catch {}
}

interface Props {
  /** "floating" — fixed bottom-right (default).  "inline" — sized for navbar slot. */
  variant?: "floating" | "inline";
}

export function ThemeSwitch({ variant = "floating" }: Props) {
  const pathname = usePathname();
  const t = useT();
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("ui-theme-mode");
    } catch {}
    const next: ThemeMode = saved === "light" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
    setMounted(true);
  }, []);

  if (pathname === "/screen") return null;
  if (!mounted) return null;

  const isLight = mode === "light";
  const nextMode: ThemeMode = isLight ? "dark" : "light";

  const className =
    variant === "inline"
      ? "inline-flex items-center justify-center h-8 w-8 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
      : "fixed z-50 right-4 bottom-4 rounded-full border border-zinc-700 bg-zinc-900/90 p-2.5 text-zinc-100 shadow-lg backdrop-blur hover:bg-zinc-800 transition-colors";

  return (
    <button
      type="button"
      onClick={() => {
        setMode(nextMode);
        applyTheme(nextMode);
      }}
      title={isLight ? t("theme.toDark") : t("theme.toLight")}
      aria-label={isLight ? t("theme.toDark") : t("theme.toLight")}
      className={className}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
