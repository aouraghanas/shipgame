"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";

type ThemeMode = "dark" | "light";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("theme-light", mode === "light");
  localStorage.setItem("ui-theme-mode", mode);
}

export function ThemeSwitch() {
  const pathname = usePathname();
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ui-theme-mode");
    const next: ThemeMode = saved === "light" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
    setMounted(true);
  }, []);

  if (pathname === "/screen") return null;
  if (!mounted) return null;

  const isLight = mode === "light";
  const nextMode: ThemeMode = isLight ? "dark" : "light";

  return (
    <button
      type="button"
      onClick={() => {
        setMode(nextMode);
        applyTheme(nextMode);
      }}
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className="fixed z-50 right-4 bottom-4 rounded-full border border-zinc-700 bg-zinc-900/90 p-2.5 text-zinc-100 shadow-lg backdrop-blur hover:bg-zinc-800 transition-colors"
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
