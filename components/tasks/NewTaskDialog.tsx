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
import { useT } from "@/components/shared/I18nProvider";
import type { BoardWithTasks, Priority, UserLite } from "./types";

export function NewTaskDialog({
  board,
  defaultColumnId,
  users,
  onClose,
  onCreated,
}: {
  board: BoardWithTasks;
  defaultColumnId: string;
  users: UserLite[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState(defaultColumnId);
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [dueAt, setDueAt] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/tasks/boards/${board.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnId,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          assigneeIds,
          labelIds,
        }),
      });
      if (r.ok) {
        onCreated();
      } else {
        const j = await r.json().catch(() => ({}));
        setError(typeof j?.error === "string" ? j.error : t("tasks.toast.failed"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("tasks.newTask")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("tasks.field.title")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("tasks.field.title.placeholder")}
              autoFocus
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("tasks.field.description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("tasks.field.column")}</Label>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {board.columns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("tasks.field.priority")}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["LOW", "NORMAL", "HIGH", "URGENT"] as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(`tasks.priority.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("tasks.field.dueAt")}</Label>
            <Input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              {t("tasks.field.assignees")}{" "}
              {assigneeIds.length > 0 && (
                <span className="text-[10px] text-zinc-500">
                  ({assigneeIds.length})
                </span>
              )}
            </Label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto rounded-md border border-zinc-800 p-2">
              {users.map((u) => {
                const active = assigneeIds.includes(u.id);
                return (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => setAssigneeIds((l) => toggle(l, u.id))}
                    className={`rounded-full px-2 py-0.5 text-[11px] border transition-colors ${
                      active
                        ? "brand-keep bg-brand text-white border-brand"
                        : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    {u.name}
                  </button>
                );
              })}
            </div>
          </div>
          {board.labels.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">{t("tasks.field.labels")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {board.labels.map((l) => {
                  const active = labelIds.includes(l.id);
                  return (
                    <button
                      type="button"
                      key={l.id}
                      onClick={() => setLabelIds((arr) => toggle(arr, l.id))}
                      className={`rounded px-2 py-0.5 text-[11px] border ${
                        active ? "text-white" : "text-zinc-400"
                      }`}
                      style={{
                        background: active ? (l.color ?? "#64748b") : "transparent",
                        borderColor: l.color ?? "#3f3f46",
                      }}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? t("common.saving") : t("tasks.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
