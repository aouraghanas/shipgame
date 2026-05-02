"use client";

import { useI18n } from "./I18nProvider";
import { Languages } from "lucide-react";

interface Props {
  /** "inline" sized for navbar slot. */
  variant?: "inline";
}

export function LanguageSwitch({ variant = "inline" }: Props) {
  const { locale, setLocale, t } = useI18n();
  const next = locale === "en" ? "ar" : "en";

  const className =
    variant === "inline"
      ? "inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-[11px] font-bold"
      : "fixed z-50 right-4 bottom-16 inline-flex items-center justify-center gap-1 h-9 px-3 rounded-full border border-zinc-700 bg-zinc-900/90 text-zinc-100 shadow-lg backdrop-blur hover:bg-zinc-800 transition-colors text-xs font-bold";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      title={t("lang.toggleTo")}
      aria-label={t("lang.toggleTo")}
      className={className}
    >
      <Languages className="h-3.5 w-3.5" />
      {next === "ar" ? "AR" : "EN"}
    </button>
  );
}
