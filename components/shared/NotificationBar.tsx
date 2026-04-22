"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, ExternalLink } from "lucide-react";

interface ActiveNotification {
  id: string;
  content: string;
  type: string;
  bgColor: string | null;
  textColor: string | null;
  icon: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  ctaNewTab: boolean;
  isDismissible: boolean;
  frequency: string;
  priority: number;
  isDismissed: boolean;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  INFO:    { bg: "#1e3a5f", text: "#93c5fd", border: "#3b82f6", icon: "ℹ️" },
  WARNING: { bg: "#451a03", text: "#fde68a", border: "#f59e0b", icon: "⚠️" },
  SUCCESS: { bg: "#052e16", text: "#86efac", border: "#22c55e", icon: "✅" },
  DANGER:  { bg: "#450a0a", text: "#fca5a5", border: "#ef4444", icon: "🚨" },
  PROMO:   { bg: "#2d1b69", text: "#c4b5fd", border: "#8b5cf6", icon: "🎉" },
};

const SESSION_KEY = "notif_session_dismissed";
const LOCAL_KEY = "notif_dismissed";

function isHiddenByFrequency(n: ActiveNotification): boolean {
  if (n.isDismissed && n.frequency === "UNTIL_DISMISSED") return true;

  if (n.frequency === "ONCE_PER_SESSION") {
    try {
      const dismissed = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "[]") as string[];
      return dismissed.includes(n.id);
    } catch { return false; }
  }

  if (n.frequency === "UNTIL_DISMISSED") {
    try {
      const dismissed = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]") as string[];
      return dismissed.includes(n.id);
    } catch { return false; }
  }

  return false;
}

function recordLocalDismiss(n: ActiveNotification) {
  if (n.frequency === "ONCE_PER_SESSION") {
    try {
      const cur = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "[]") as string[];
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(new Set([...cur, n.id]))));
    } catch { /* noop */ }
  } else if (n.frequency === "UNTIL_DISMISSED") {
    try {
      const cur = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]") as string[];
      localStorage.setItem(LOCAL_KEY, JSON.stringify(Array.from(new Set([...cur, n.id]))));
    } catch { /* noop */ }
  }
}

const PAGE_MAP: Record<string, string> = {
  "/leaderboard": "leaderboard",
  "/dashboard": "dashboard",
  "/screen": "screen",
  "/activity": "activity",
  "/profile": "profile",
};

export function NotificationBar() {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<ActiveNotification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const page = PAGE_MAP[pathname] || pathname.split("/")[1] || "leaderboard";

  useEffect(() => {
    fetch(`/api/notifications/active?page=${page}`)
      .then((r) => r.json())
      .then((data: ActiveNotification[]) => {
        setNotifications(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [page]);

  const handleDismiss = async (n: ActiveNotification) => {
    recordLocalDismiss(n);
    setDismissed((prev) => new Set(Array.from(prev).concat(n.id)));
    if (n.isDismissed === false) {
      await fetch(`/api/notifications/${n.id}/dismiss`, { method: "POST" }).catch(() => {});
    }
  };

  if (!loaded) return null;

  const visible = notifications.filter(
    (n) => !dismissed.has(n.id) && !isHiddenByFrequency(n)
  );

  if (visible.length === 0) return null;

  return (
    <div className="notification-bars-wrapper">
      {visible.map((n) => {
        const preset = TYPE_STYLES[n.type] || TYPE_STYLES.INFO;
        const bg = n.bgColor || preset.bg;
        const text = n.textColor || preset.text;
        const border = preset.border;
        const icon = n.icon || preset.icon;

        return (
          <div
            key={n.id}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-sm animate-fade-in"
            style={{ backgroundColor: bg, borderBottom: `1px solid ${border}`, color: text }}
          >
            <span className="flex-shrink-0 text-base">{icon}</span>

            <div
              className="flex-1 min-w-0 notification-content"
              style={{ color: text }}
              dangerouslySetInnerHTML={{ __html: n.content }}
            />

            {n.ctaText && n.ctaUrl && (
              <a
                href={n.ctaUrl}
                target={n.ctaNewTab ? "_blank" : "_self"}
                rel="noreferrer"
                className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold underline opacity-80 hover:opacity-100 whitespace-nowrap"
                style={{ color: text }}
              >
                {n.ctaText}
                {n.ctaNewTab && <ExternalLink className="h-3 w-3" />}
              </a>
            )}

            {n.isDismissible && (
              <button
                onClick={() => handleDismiss(n)}
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: text }}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
