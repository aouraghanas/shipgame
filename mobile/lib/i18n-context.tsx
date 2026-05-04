import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert, I18nManager } from "react-native";
import * as Localization from "expo-localization";
import * as Updates from "expo-updates";
import { DEFAULT_LOCALE, isRtl, translate, type Locale } from "./i18n";
import { prefs } from "./storage";

const STORAGE_KEY = "ui-locale";

interface Ctx {
  locale: Locale;
  setLocale: (l: Locale) => Promise<void>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  rtl: boolean;
}

const I18nContext = createContext<Ctx | null>(null);

function detectInitialLocale(): Locale {
  const code = (Localization.getLocales()[0]?.languageCode ?? "en").toLowerCase();
  return code === "ar" ? "ar" : DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    (async () => {
      try {
        const saved = (await prefs.get(STORAGE_KEY)) as Locale | null;
        const next = saved === "ar" || saved === "en" ? saved : detectInitialLocale();
        setLocaleState(next);
        const wantRtl = isRtl(next);
        if (I18nManager.isRTL !== wantRtl) {
          I18nManager.allowRTL(wantRtl);
          I18nManager.forceRTL(wantRtl);
        }
      } catch {}
    })();
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    await prefs.set(STORAGE_KEY, l);
    const wantRtl = isRtl(l);
    if (I18nManager.isRTL !== wantRtl) {
      I18nManager.allowRTL(wantRtl);
      I18nManager.forceRTL(wantRtl);
      Alert.alert(
        l === "ar" ? "إعادة تشغيل" : "Restart needed",
        l === "ar"
          ? "تم تطبيق العربية. سيُعاد تشغيل التطبيق لتفعيل اتجاه RTL."
          : "Switching to LTR. The app will restart to apply layout direction.",
        [
          {
            text: "OK",
            onPress: async () => {
              try {
                await Updates.reloadAsync();
              } catch {
                // dev / Expo Go: silently update state and let the user reopen
                setLocaleState(l);
              }
            },
          },
        ]
      );
      return;
    }
    setLocaleState(l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo<Ctx>(
    () => ({ locale, setLocale, t, rtl: isRtl(locale) }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
