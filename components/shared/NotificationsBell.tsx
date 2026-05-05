"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useT } from "./I18nProvider";

type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  ticketId: string | null;
  readAt: string | null;
  createdAt: string;
};

const POLL_MS = 30_000;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationsBell() {
  const { status } = useSession();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const refreshCount = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const r = await fetch("/api/me/notifications/count", { cache: "no-store" });
      if (!r.ok) return;
      const j: { unread: number } = await r.json();
      setUnread(j.unread || 0);
    } catch {
      /* network blips happen — silent */
    }
  }, [status]);

  const loadList = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    try {
      const r = await fetch("/api/me/notifications?take=20", { cache: "no-store" });
      if (!r.ok) return;
      const j: { items: NotificationItem[]; unread: number } = await r.json();
      setItems(j.items);
      setUnread(j.unread);
    } finally {
      setLoading(false);
    }
  }, [status]);

  // Poll unread count while signed in.
  useEffect(() => {
    if (status !== "authenticated") return;
    void refreshCount();
    const id = window.setInterval(() => void refreshCount(), POLL_MS);
    return () => window.clearInterval(id);
  }, [status, refreshCount]);

  // First open → fetch the list. Re-open also reloads (cheap, keeps it fresh).
  useEffect(() => {
    if (open) void loadList();
  }, [open, loadList]);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function markRead(ids: string[] | "all") {
    if (status !== "authenticated") return;
    setMarking(true);
    try {
      const body = ids === "all" ? { all: true } : { ids };
      const r = await fetch("/api/me/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) return;
      const now = new Date().toISOString();
      setItems((prev) =>
        prev
          ? prev.map((n) =>
              ids === "all" || ids.includes(n.id) ? { ...n, readAt: n.readAt ?? now } : n
            )
          : prev
      );
      void refreshCount();
    } finally {
      setMarking(false);
    }
  }

  function onItemClick(n: NotificationItem) {
    if (!n.readAt) void markRead([n.id]);
    setOpen(false);
  }

  if (status !== "authenticated") return null;

  const hasUnread = unread > 0;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("notif.bellAria")}
        title={t("notif.bellAria")}
        className={`relative flex items-center justify-center rounded-md p-1.5 transition-colors ${
          hasUnread
            ? "text-brand hover:bg-zinc-800"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
        }`}
      >
        <Bell className="h-4 w-4" />
        {hasUnread && (
          <span className="brand-keep absolute -top-0.5 -right-0.5 inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white shadow ring-2 ring-zinc-950">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="notif-panel absolute right-0 mt-2 w-[min(22rem,90vw)] origin-top-right rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl ring-1 ring-black/40 z-50"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
            <p className="text-sm font-semibold text-zinc-100">{t("notif.title")}</p>
            <div className="flex items-center gap-1">
              {hasUnread && (
                <button
                  type="button"
                  onClick={() => void markRead("all")}
                  disabled={marking}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <Check className="h-3 w-3" />
                  {t("notif.markAllRead")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                aria-label={t("common.cancel")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto py-1">
            {loading && !items && (
              <p className="px-3 py-6 text-center text-sm text-zinc-500">
                {t("common.loading")}
              </p>
            )}
            {items && items.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-zinc-500">
                {t("notif.empty")}
              </p>
            )}
            {items?.map((n) => {
              const unreadRow = !n.readAt;
              const Inner = (
                <div
                  className={`group flex gap-2 px-3 py-2.5 text-sm transition-colors ${
                    unreadRow ? "bg-brand/10" : "hover:bg-zinc-900"
                  }`}
                >
                  <span
                    className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
                      unreadRow ? "bg-brand" : "bg-transparent"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate ${
                        unreadRow ? "font-semibold text-zinc-100" : "text-zinc-300"
                      }`}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{n.body}</p>
                    )}
                    <p className="mt-0.5 text-[10px] text-zinc-600">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              );

              return n.link ? (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => onItemClick(n)}
                  className="block"
                >
                  {Inner}
                </Link>
              ) : (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onItemClick(n)}
                  className="block w-full text-left"
                >
                  {Inner}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
