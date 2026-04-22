"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  type: string;
  isActive: boolean;
  isDraft: boolean;
  startAt: string | null;
  endAt: string | null;
  targetRoles: string[];
  displayPages: string[];
  priority: number;
  dismissCount: number;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  INFO: "bg-blue-900/40 text-blue-300 border-blue-700",
  WARNING: "bg-amber-900/40 text-amber-300 border-amber-700",
  SUCCESS: "bg-emerald-900/40 text-emerald-300 border-emerald-700",
  DANGER: "bg-red-900/40 text-red-300 border-red-700",
  PROMO: "bg-violet-900/40 text-violet-300 border-violet-700",
};

const TYPE_ICONS: Record<string, string> = {
  INFO: "ℹ️", WARNING: "⚠️", SUCCESS: "✅", DANGER: "🚨", PROMO: "🎉",
};

function getStatus(n: Notification) {
  const now = new Date();
  if (n.isDraft) return { label: "Draft", cls: "text-zinc-400" };
  if (!n.isActive) return { label: "Inactive", cls: "text-zinc-500" };
  if (n.startAt && new Date(n.startAt) > now) return { label: "Scheduled", cls: "text-amber-400" };
  if (n.endAt && new Date(n.endAt) < now) return { label: "Expired", cls: "text-red-400" };
  return { label: "Active", cls: "text-emerald-400" };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () =>
    fetch("/api/notifications")
      .then((r) => r.json())
      .then(setNotifications)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    setDeleting(id);
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setNotifications((ns) => ns.filter((n) => n.id !== id));
    setDeleting(null);
  };

  const handleDuplicate = async (n: Notification) => {
    const res = await fetch(`/api/notifications/${n.id}`);
    const data = await res.json();
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, title: `${data.title} (copy)`, isActive: false, isDraft: true }),
    });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-zinc-400 mt-1">Manage announcement bars shown to users</p>
        </div>
        <Link href="/admin/notifications/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Notification
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-lg mb-2">No notifications yet</p>
          <p className="text-sm">Create your first announcement bar to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const status = getStatus(n);
            return (
              <div
                key={n.id}
                className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                {/* Type badge */}
                <span className="text-xl flex-shrink-0">{TYPE_ICONS[n.type]}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-zinc-100">{n.title}</p>
                    <span className={`text-xs border rounded-full px-2 py-0.5 ${TYPE_COLORS[n.type]}`}>
                      {n.type}
                    </span>
                    <span className={`text-xs font-medium ${status.cls}`}>● {status.label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 flex-wrap">
                    <span>Priority: {n.priority}</span>
                    <span>Pages: {n.displayPages.join(", ")}</span>
                    <span>Audience: {n.targetRoles.length === 0 ? "Everyone" : n.targetRoles.join(", ")}</span>
                    <span>{n.dismissCount} dismissed</span>
                    {n.startAt && <span>From: {new Date(n.startAt).toLocaleDateString()}</span>}
                    {n.endAt && <span>Until: {new Date(n.endAt).toLocaleDateString()}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Duplicate"
                    onClick={() => handleDuplicate(n)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Link href={`/admin/notifications/${n.id}/edit`}>
                    <Button variant="ghost" size="icon" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    disabled={deleting === n.id}
                    onClick={() => handleDelete(n.id, n.title)}
                    className="hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
