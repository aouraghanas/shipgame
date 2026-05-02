"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, isRtl, localeFromString, translate, type Locale } from "@/lib/i18n";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  rtl: boolean;
};

const I18nContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "ui-locale";

function applyDocumentLocale(l: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = l;
  document.documentElement.dir = isRtl(l) ? "rtl" : "ltr";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {}
    const next = localeFromString(saved);
    setLocaleState(next);
    applyDocumentLocale(next);
    setHydrated(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    applyDocumentLocale(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo<Ctx>(
    () => ({ locale, setLocale, t, rtl: isRtl(locale) }),
    [locale, setLocale, t]
  );

  // Avoid SSR/CSR text mismatch by rendering English (default) until hydrated
  // applies the user's saved locale. Prevents hydration warnings when the
  // saved locale is Arabic.
  if (!hydrated) {
    const fallback: Ctx = {
      locale: DEFAULT_LOCALE,
      setLocale,
      t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
      rtl: false,
    };
    return <I18nContext.Provider value={fallback}>{children}</I18nContext.Provider>;
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback when used outside provider (defensive — every page has it via root layout).
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
      rtl: false,
    };
  }
  return ctx;
}

/** Convenience hook to grab just the translate function. */
export function useT() {
  return useI18n().t;
}
