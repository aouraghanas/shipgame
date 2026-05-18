"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Search } from "lucide-react";
import { useT } from "@/components/shared/I18nProvider";
import { Avatar } from "./Avatar";
import type { UserLite } from "./types";

/** Curated emoji set — common business / kanban icons. Free-text input below the grid lets users paste anything. */
const EMOJI_CHOICES = [
  "📋", "💼", "🛠️", "💻", "📦", "💰",
  "📈", "🚀", "⚡", "🎯", "📊", "🎨",
  "🤝", "🔧", "📞", "🏆", "🛒", "📅",
  "🧠", "🔔", "🧾", "📝", "📁", "📚",
  "🌐", "🛡️", "⚙️", "👥", "🏷️", "🔥",
];

const COLOR_CHOICES = [
  "#3b82f6", "#a855f7", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
  "#6366f1", "#64748b",
];

type Visibility = "PUBLIC" | "TEAM_ONLY" | "PRIVATE";

export function NewBoardDialog({
  users,
  onClose,
  onCreated,
}: {
  users: UserLite[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<string>("📋");
  const [color, setColor] = useState<string>(COLOR_CHOICES[0]);
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleMember(userId: string) {
    setMemberIds((arr) =>
      arr.includes(userId) ? arr.filter((id) => id !== userId) : [...arr, userId]
    );
  }

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.role ?? "").toLowerCase().includes(q)
    );
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/tasks/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          icon: icon || undefined,
          color,
          visibility,
          // Only forward member ids when access is restricted. PUBLIC
          // boards don't need an explicit member list.
          memberIds: visibility === "PUBLIC" ? undefined : memberIds,
        }),
      });
      if (r.ok) {
        onCreated();
      } else {
        const j = await r.json().catch(() => ({}));
        setError(typeof j?.error === "string" ? j.error : t("tasks.toast.failed"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("tasks.newBoard")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {/* Live preview chip */}
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-xl"
              style={{ background: color + "22" }}
            >
              {icon || "📋"}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-zinc-100 truncate">
                {name.trim() || t("tasks.board.namePlaceholder")}
              </p>
              <p className="text-[11px] text-zinc-500">
                {t(`tasks.visibility.${visibility}`)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("tasks.field.title")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("tasks.board.namePlaceholder")}
                autoFocus
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("tasks.board.emoji")}</Label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value.slice(0, 4))}
                maxLength={4}
                placeholder="📋"
                className="text-center text-lg"
              />
            </div>
          </div>

          {/* Emoji picker */}
          <div className="space-y-1">
            <Label className="text-xs">{t("tasks.board.emojiPick")}</Label>
            <div className="flex flex-wrap gap-1 rounded-md border border-zinc-800 bg-zinc-900 p-2">
              {EMOJI_CHOICES.map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setIcon(e)}
                  className={`flex h-9 w-9 items-center justify-center rounded-md text-lg transition-colors ${
                    icon === e
                      ? "bg-brand/20 ring-1 ring-brand"
                      : "hover:bg-zinc-800"
                  }`}
                  aria-label={`Choose ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-1">
            <Label className="text-xs">{t("tasks.board.color")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_CHOICES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-zinc-950 transition-all ${
                    color === c ? "ring-zinc-100" : "ring-transparent hover:ring-zinc-700"
                  }`}
                  style={{ background: c }}
                  aria-label={`Choose ${c}`}
                >
                  {color === c && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs">
              {t("tasks.field.description")}{" "}
              <span className="text-zinc-500">{t("common.optional")}</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t("tasks.board.descriptionPlaceholder")}
            />
          </div>

          {/* Visibility */}
          <div className="space-y-1">
            <Label className="text-xs">{t("tasks.board.visibility")}</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as Visibility)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">
                  <div>
                    <p className="font-medium">{t("tasks.visibility.PUBLIC")}</p>
                    <p className="text-[10px] text-zinc-500">
                      {t("tasks.visibility.PUBLIC.help")}
                    </p>
                  </div>
                </SelectItem>
                <SelectItem value="TEAM_ONLY">
                  <div>
                    <p className="font-medium">{t("tasks.visibility.TEAM_ONLY")}</p>
                    <p className="text-[10px] text-zinc-500">
                      {t("tasks.visibility.TEAM_ONLY.help")}
                    </p>
                  </div>
                </SelectItem>
                <SelectItem value="PRIVATE">
                  <div>
                    <p className="font-medium">{t("tasks.visibility.PRIVATE")}</p>
                    <p className="text-[10px] text-zinc-500">
                      {t("tasks.visibility.PRIVATE.help")}
                    </p>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Members — only meaningful for TEAM_ONLY */}
          {visibility === "TEAM_ONLY" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">
                  {t("tasks.board.members")}{" "}
                  {memberIds.length > 0 && (
                    <span className="text-zinc-500">({memberIds.length})</span>
                  )}
                </Label>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMemberIds(users.map((u) => u.id))}
                    className="text-[11px]"
                  >
                    {t("tasks.board.selectAll")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMemberIds([])}
                    className="text-[11px]"
                  >
                    {t("tasks.board.clear")}
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t("tasks.board.searchUsers")}
                  className="pl-7 h-8 text-xs"
                />
              </div>
              <div className="rounded-md border border-zinc-800 bg-zinc-900 max-h-60 overflow-y-auto divide-y divide-zinc-800/60">
                {filteredUsers.length === 0 && (
                  <p className="text-xs text-zinc-500 italic p-3">
                    {t("tasks.board.noMatchingUsers")}
                  </p>
                )}
                {filteredUsers.map((u) => {
                  const active = memberIds.includes(u.id);
                  return (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => toggleMember(u.id)}
                      className={`flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors ${
                        active ? "bg-brand/10" : "hover:bg-zinc-800"
                      }`}
                    >
                      <Avatar user={u} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-100 truncate">{u.name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {u.email}
                          {u.role && (
                            <span className="ml-1 uppercase tracking-wider">
                              · {u.role}
                            </span>
                          )}
                        </p>
                      </div>
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          active
                            ? "border-brand bg-brand text-white"
                            : "border-zinc-700"
                        }`}
                      >
                        {active && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-zinc-500">
                {t("tasks.board.members.adminNote")}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? t("common.saving") : t("tasks.board.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
