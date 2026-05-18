"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  CalendarDays,
  CheckSquare,
  MessageCircle,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useT } from "@/components/shared/I18nProvider";
import { Avatar } from "./Avatar";
import type {
  BoardWithTasks,
  Priority,
  TaskDetail,
  UserLite,
} from "./types";

const PRIORITY_COLOR: Record<Priority, string> = {
  URGENT: "text-red-300 bg-red-500/15 border-red-500/40",
  HIGH: "text-amber-300 bg-amber-500/15 border-amber-500/40",
  NORMAL: "text-zinc-300 bg-zinc-700/40 border-zinc-700",
  LOW: "text-zinc-400 bg-zinc-800/60 border-zinc-800",
};

function formatActivity(
  kind: string,
  payload: Record<string, unknown> | null,
  t: (key: string) => string
): string {
  switch (kind) {
    case "CREATED":
      return t("tasks.activity.created");
    case "TITLE_CHANGED":
      return t("tasks.activity.title");
    case "DESCRIPTION_CHANGED":
      return t("tasks.activity.desc");
    case "PRIORITY_CHANGED":
      return `${t("tasks.activity.priority")}: ${String(payload?.from ?? "")} → ${String(
        payload?.to ?? ""
      )}`;
    case "STATUS_CHANGED":
      return `${t("tasks.activity.moved")}: ${String(payload?.fromColumnName ?? "")} → ${String(
        payload?.toColumnName ?? ""
      )}`;
    case "DUE_DATE_CHANGED":
      return t("tasks.activity.due");
    case "ASSIGNEE_ADDED":
      return t("tasks.activity.assigned");
    case "ASSIGNEE_REMOVED":
      return t("tasks.activity.unassigned");
    case "LABEL_ADDED":
      return t("tasks.activity.labelAdded");
    case "LABEL_REMOVED":
      return t("tasks.activity.labelRemoved");
    case "CHECKLIST_ITEM_ADDED":
      return t("tasks.activity.checklistAdded");
    case "CHECKLIST_ITEM_COMPLETED":
      return t("tasks.activity.checklistDone");
    case "CHECKLIST_ITEM_REMOVED":
      return t("tasks.activity.checklistRemoved");
    case "COMMENT_ADDED":
      return t("tasks.activity.commented");
    case "ARCHIVED":
      return t("tasks.activity.archived");
    case "RESTORED":
      return t("tasks.activity.restored");
    default:
      return kind;
  }
}

export function TaskDetailDrawer({
  taskId,
  users,
  board,
  onClose,
  onChanged,
}: {
  taskId: string;
  users: UserLite[];
  board: BoardWithTasks | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: session } = useSession();
  const me = session?.user;
  const isAdmin = me?.role === "ADMIN";
  const t = useT();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local edit buffers
  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [newChecklist, setNewChecklist] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/tasks/tasks/${taskId}`);
      if (r.ok) {
        const data = (await r.json()) as TaskDetail;
        setTask(data);
        setTitle(data.title);
        setDescription(data.description ?? "");
      } else {
        const j = await r.json().catch(() => ({}));
        setError(typeof j?.error === "string" ? j.error : "Failed to load task.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function patchTask(body: Record<string, unknown>) {
    setSaving(true);
    try {
      const r = await fetch(`/api/tasks/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        await reload();
        onChanged();
      } else {
        const j = await r.json().catch(() => ({}));
        setError(typeof j?.error === "string" ? j.error : "Save failed.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveTitle() {
    setEditingTitle(false);
    if (!task || title.trim() === task.title) return;
    await patchTask({ title: title.trim() });
  }
  async function saveDesc() {
    setEditingDesc(false);
    if (!task || description.trim() === (task.description ?? "")) return;
    await patchTask({ description: description.trim() || null });
  }

  async function changeColumn(newColId: string) {
    if (!task || newColId === task.columnId) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/tasks/tasks/${taskId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toColumnId: newColId }),
      });
      if (r.ok) {
        await reload();
        onChanged();
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleAssignee(userId: string) {
    if (!task) return;
    const current = task.assignees.map((a) => a.id);
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    await fetch(`/api/tasks/tasks/${taskId}/assignees`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: next }),
    });
    await reload();
    onChanged();
  }

  async function toggleLabel(labelId: string) {
    if (!task) return;
    const current = task.labels.map((l) => l.id);
    const next = current.includes(labelId)
      ? current.filter((id) => id !== labelId)
      : [...current, labelId];
    await fetch(`/api/tasks/tasks/${taskId}/labels`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labelIds: next }),
    });
    await reload();
    onChanged();
  }

  async function addChecklistItem() {
    const label = newChecklist.trim();
    if (!label) return;
    await fetch(`/api/tasks/tasks/${taskId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    setNewChecklist("");
    await reload();
    onChanged();
  }

  async function toggleChecklistItem(itemId: string, done: boolean) {
    await fetch(`/api/tasks/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    await reload();
    onChanged();
  }

  async function removeChecklistItem(itemId: string) {
    await fetch(`/api/tasks/checklist/${itemId}`, { method: "DELETE" });
    await reload();
    onChanged();
  }

  async function postComment() {
    const body = commentBody.trim();
    if (!body) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/tasks/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (r.ok) {
        setCommentBody("");
        await reload();
        onChanged();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteComment(commentId: string) {
    if (!confirm(t("tasks.confirm.deleteComment"))) return;
    await fetch(`/api/tasks/comments/${commentId}`, { method: "DELETE" });
    await reload();
    onChanged();
  }

  async function archiveTask() {
    if (!confirm(t("tasks.confirm.archive"))) return;
    await fetch(`/api/tasks/tasks/${taskId}`, { method: "DELETE" });
    onChanged();
    onClose();
  }

  const checklistDone = task?.checklist.filter((c) => c.done).length ?? 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>{task?.title ?? "Task"}</DialogTitle>
        </DialogHeader>

        {loading && (
          <p className="text-sm text-zinc-500 py-10 text-center">
            {t("common.loading")}…
          </p>
        )}
        {error && (
          <div className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {task && !loading && (
          <div className="space-y-5">
            {/* Title row */}
            <div>
              {editingTitle ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void saveTitle();
                    }
                  }}
                  autoFocus
                  className="text-lg font-semibold"
                />
              ) : (
                <h2
                  className="text-lg font-semibold text-zinc-100 cursor-pointer hover:bg-zinc-900 rounded px-1 -mx-1"
                  onClick={() => setEditingTitle(true)}
                >
                  {task.title}
                </h2>
              )}
              <p className="mt-1 text-[11px] text-zinc-500">
                {board?.name} · #{task.id.slice(-6)} · {t("tasks.detail.created")}{" "}
                {new Date(task.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-[1fr_220px]">
              {/* Main column */}
              <div className="space-y-4 min-w-0">
                {/* Description */}
                <section>
                  <Label className="text-xs uppercase tracking-wider text-zinc-500">
                    {t("tasks.field.description")}
                  </Label>
                  {editingDesc ? (
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={saveDesc}
                      rows={4}
                      autoFocus
                    />
                  ) : (
                    <div
                      className="mt-1 min-h-[2.5rem] rounded-md border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-zinc-200 whitespace-pre-wrap cursor-pointer hover:border-zinc-700"
                      onClick={() => setEditingDesc(true)}
                    >
                      {task.description || (
                        <span className="text-zinc-500 italic">
                          {t("tasks.detail.noDescription")}
                        </span>
                      )}
                    </div>
                  )}
                </section>

                {/* Checklist */}
                <section>
                  <Label className="text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                    <CheckSquare className="h-3 w-3" />
                    {t("tasks.detail.checklist")}
                    {task.checklist.length > 0 && (
                      <span className="font-mono text-zinc-600">
                        {checklistDone}/{task.checklist.length}
                      </span>
                    )}
                  </Label>
                  <ul className="mt-1 space-y-1">
                    {task.checklist.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm"
                      >
                        <button
                          type="button"
                          onClick={() => void toggleChecklistItem(item.id, !item.done)}
                          className="shrink-0 text-zinc-400 hover:text-brand"
                        >
                          {item.done ? (
                            <CheckSquare className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                        <span
                          className={`flex-1 ${
                            item.done ? "line-through text-zinc-500" : "text-zinc-200"
                          }`}
                        >
                          {item.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => void removeChecklistItem(item.id)}
                          className="text-zinc-600 hover:text-red-400"
                          aria-label={t("common.delete")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={newChecklist}
                      onChange={(e) => setNewChecklist(e.target.value)}
                      placeholder={t("tasks.detail.addChecklist")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void addChecklistItem();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void addChecklistItem()}
                      disabled={!newChecklist.trim()}
                    >
                      {t("tasks.detail.add")}
                    </Button>
                  </div>
                </section>

                {/* Comments / discussion */}
                <section>
                  <Label className="text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                    <MessageCircle className="h-3 w-3" />
                    {t("tasks.detail.discussion")}
                    <span className="font-mono text-zinc-600">
                      ({task.comments.length})
                    </span>
                  </Label>
                  <div className="mt-1 space-y-2">
                    {task.comments.map((c) => {
                      const mine = c.authorId === me?.id;
                      const canDelete = mine || isAdmin;
                      return (
                        <div
                          key={c.id}
                          className="flex gap-2 rounded-md border border-zinc-800 bg-zinc-900 p-2.5"
                        >
                          <Avatar user={c.author} size="md" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                              <span className="font-medium text-zinc-300">
                                {c.author.name}
                              </span>
                              <span>
                                {new Date(c.createdAt).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                                {c.editedAt && (
                                  <span className="italic ml-1">
                                    · {t("tasks.detail.edited")}
                                  </span>
                                )}
                              </span>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => void deleteComment(c.id)}
                                  className="ml-auto text-zinc-600 hover:text-red-400"
                                  aria-label={t("common.delete")}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <p className="mt-0.5 text-sm text-zinc-200 whitespace-pre-wrap">
                              {c.body}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {task.comments.length === 0 && (
                      <p className="text-xs text-zinc-500 italic">
                        {t("tasks.detail.discussion.empty")}
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2 items-start">
                    <Textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder={t("tasks.detail.commentPlaceholder")}
                      rows={2}
                    />
                    <Button
                      type="button"
                      onClick={() => void postComment()}
                      disabled={saving || !commentBody.trim()}
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      {t("tasks.detail.send")}
                    </Button>
                  </div>
                </section>

                {/* Activity log */}
                <section>
                  <Label className="text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                    <Activity className="h-3 w-3" />
                    {t("tasks.detail.activity")}
                  </Label>
                  <ul className="mt-1 space-y-1 max-h-60 overflow-y-auto pr-1">
                    {task.activity.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-2 text-xs text-zinc-500"
                      >
                        {a.actor && (
                          <Avatar user={a.actor} size="sm" />
                        )}
                        <span className="text-zinc-400">
                          <span className="font-medium text-zinc-300">
                            {a.actor?.name ?? t("tasks.detail.system")}
                          </span>{" "}
                          {formatActivity(a.kind, a.payload, t)}
                        </span>
                        <span className="ml-auto text-zinc-600 font-mono text-[10px]">
                          {new Date(a.createdAt).toLocaleString()}
                        </span>
                      </li>
                    ))}
                    {task.activity.length === 0 && (
                      <li className="text-xs text-zinc-600 italic">
                        {t("tasks.detail.activity.empty")}
                      </li>
                    )}
                  </ul>
                </section>
              </div>

              {/* Side column */}
              <aside className="space-y-3 text-sm">
                <SideField label={t("tasks.field.status")}>
                  <Select value={task.columnId} onValueChange={(v) => void changeColumn(v)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {board?.columns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SideField>

                <SideField label={t("tasks.field.priority")}>
                  <Select
                    value={task.priority}
                    onValueChange={(v) => void patchTask({ priority: v })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["LOW", "NORMAL", "HIGH", "URGENT"] as Priority[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          <span
                            className={`inline-block rounded border px-1.5 py-0.5 text-[10px] ${PRIORITY_COLOR[p]}`}
                          >
                            {t(`tasks.priority.${p}`)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SideField>

                <SideField label={t("tasks.field.dueAt")}>
                  <Input
                    type="date"
                    value={task.dueAt ? task.dueAt.slice(0, 10) : ""}
                    onChange={(e) =>
                      void patchTask({
                        dueAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                    className="h-8 text-xs"
                  />
                  {task.dueAt && (
                    <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(task.dueAt).toLocaleDateString()}
                    </p>
                  )}
                </SideField>

                <SideField label={t("tasks.field.assignees")}>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                      {task.assignees.map((a) => (
                        <span
                          key={a.id}
                          className="inline-flex items-center gap-1 rounded-full bg-zinc-800 pl-0.5 pr-2 py-0.5 text-[11px]"
                        >
                          <Avatar user={a} size="sm" />
                          <span>{a.name}</span>
                          <button
                            type="button"
                            onClick={() => void toggleAssignee(a.id)}
                            className="ml-0.5 text-zinc-500 hover:text-red-400"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                      {task.assignees.length === 0 && (
                        <span className="text-[11px] text-zinc-500 italic">
                          {t("tasks.detail.noAssignees")}
                        </span>
                      )}
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-brand hover:underline">
                        + {t("tasks.detail.addAssignee")}
                      </summary>
                      <div className="mt-1 flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                        {users
                          .filter((u) => !task.assignees.some((a) => a.id === u.id))
                          .map((u) => (
                            <button
                              type="button"
                              key={u.id}
                              onClick={() => void toggleAssignee(u.id)}
                              className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 hover:bg-zinc-800"
                            >
                              {u.name}
                            </button>
                          ))}
                      </div>
                    </details>
                  </div>
                </SideField>

                <SideField label={t("tasks.field.labels")}>
                  <div className="flex flex-wrap gap-1">
                    {board?.labels.map((l) => {
                      const active = task.labels.some((tl) => tl.id === l.id);
                      return (
                        <button
                          type="button"
                          key={l.id}
                          onClick={() => void toggleLabel(l.id)}
                          className={`rounded px-1.5 py-0.5 text-[11px] border transition-opacity ${
                            active ? "" : "opacity-40 hover:opacity-100"
                          }`}
                          style={{
                            background: (l.color ?? "#64748b") + "33",
                            borderColor: l.color ?? "#3f3f46",
                            color: l.color ?? "#94a3b8",
                          }}
                        >
                          {l.name}
                        </button>
                      );
                    })}
                  </div>
                </SideField>

                <SideField label={t("tasks.field.reporter")}>
                  {task.reporter ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-300">
                      <Avatar user={task.reporter} size="sm" />
                      {task.reporter.name}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500 italic">—</span>
                  )}
                </SideField>

                <div className="pt-2 border-t border-zinc-800">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-red-400 hover:bg-red-950/40"
                    onClick={() => void archiveTask()}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {t("tasks.detail.archive")}
                  </Button>
                </div>
              </aside>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SideField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </Label>
      <div>{children}</div>
    </div>
  );
}
