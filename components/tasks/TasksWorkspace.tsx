"use client";

/**
 * Tasks workspace — multi-board kanban app.
 *
 * Layout:
 *   ┌─ board switcher (chips) ─────────────────────────────┐
 *   │ filter bar (search + assignee/priority/label/due)    │
 *   ├──────────────────────────────────────────────────────┤
 *   │  Backlog | To do | In progress | In review | Done    │
 *   │   ▢     │   ▢   │     ▢       │    ▢      │   ▢    │
 *   │   …     │   …   │     …       │    …      │   …    │
 *   └──────────────────────────────────────────────────────┘
 *
 * Drag and drop powered by @dnd-kit. Cards can move between columns
 * (status change) and within a column (reordering). A right-side
 * drawer opens for the detail view (TaskDetailDrawer).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, X, Filter as FilterIcon } from "lucide-react";
import { useT } from "@/components/shared/I18nProvider";
import { TaskCard } from "./TaskCard";
import { KanbanColumn } from "./KanbanColumn";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { NewTaskDialog } from "./NewTaskDialog";
import type {
  BoardListItem,
  BoardWithTasks,
  Priority,
  TaskLite,
  UserLite,
} from "./types";

const PRIORITY_LABELS: Record<Priority | "all", string> = {
  all: "tasks.filter.priority.all",
  LOW: "tasks.priority.LOW",
  NORMAL: "tasks.priority.NORMAL",
  HIGH: "tasks.priority.HIGH",
  URGENT: "tasks.priority.URGENT",
};

export function TasksWorkspace() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(
    searchParams.get("board")
  );
  const [board, setBoard] = useState<BoardWithTasks | null>(null);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [filterLabel, setFilterLabel] = useState<string>("all");
  const [filterDue, setFilterDue] = useState<"all" | "today" | "this_week" | "overdue">(
    "all"
  );

  // Open task detail
  const openTaskId = searchParams.get("task");

  // New task dialog
  const [newTaskColumnId, setNewTaskColumnId] = useState<string | null>(null);

  // Drag tracking
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const loadBoards = useCallback(async () => {
    try {
      const r = await fetch("/api/tasks/boards");
      if (r.ok) {
        const data = (await r.json()) as BoardListItem[];
        setBoards(data);
        if (!activeBoardId && data.length > 0) {
          setActiveBoardId(data[0].id);
        }
      } else {
        setError("Failed to load boards.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    }
  }, [activeBoardId]);

  const loadBoard = useCallback(async (boardId: string) => {
    setLoadingBoard(true);
    try {
      const r = await fetch(`/api/tasks/boards/${boardId}`);
      if (r.ok) {
        setBoard(await r.json());
      } else {
        const j = await r.json().catch(() => ({}));
        setError(typeof j?.error === "string" ? j.error : "Failed to load board.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setLoadingBoard(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    const r = await fetch("/api/tasks/users");
    if (r.ok) setUsers(await r.json());
  }, []);

  useEffect(() => {
    void loadBoards();
    void loadUsers();
  }, [loadBoards, loadUsers]);

  useEffect(() => {
    if (activeBoardId) void loadBoard(activeBoardId);
  }, [activeBoardId, loadBoard]);

  // Reflect the current board id in the URL so links / refreshes work.
  useEffect(() => {
    if (!activeBoardId) return;
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("board") !== activeBoardId) {
      params.set("board", activeBoardId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [activeBoardId, searchParams, router, pathname]);

  const filteredTasks = useMemo<TaskLite[]>(() => {
    if (!board) return [];
    const s = search.trim().toLowerCase();
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfDay);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    return board.tasks.filter((t) => {
      if (s) {
        const blob = `${t.title} ${t.description ?? ""}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      if (filterAssignee !== "all") {
        if (filterAssignee === "unassigned") {
          if (t.assignees.length > 0) return false;
        } else if (!t.assignees.some((a) => a.id === filterAssignee)) {
          return false;
        }
      }
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterLabel !== "all" && !t.labels.some((l) => l.id === filterLabel))
        return false;
      if (filterDue !== "all") {
        if (!t.dueAt) return false;
        const due = new Date(t.dueAt);
        if (filterDue === "today") {
          if (due < startOfDay) return false;
          const eod = new Date(startOfDay);
          eod.setDate(eod.getDate() + 1);
          if (due >= eod) return false;
        } else if (filterDue === "this_week") {
          if (due < startOfDay || due > endOfWeek) return false;
        } else if (filterDue === "overdue") {
          if (due >= startOfDay) return false;
        }
      }
      return true;
    });
  }, [board, search, filterAssignee, filterPriority, filterLabel, filterDue]);

  const tasksByColumn = useMemo(() => {
    const map: Record<string, TaskLite[]> = {};
    if (!board) return map;
    for (const c of board.columns) map[c.id] = [];
    for (const task of filteredTasks) {
      (map[task.columnId] = map[task.columnId] ?? []).push(task);
    }
    for (const colId of Object.keys(map)) {
      map[colId].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [board, filteredTasks]);

  const activeTask = useMemo(() => {
    if (!board) return null;
    return board.tasks.find((t) => t.id === activeDragId) ?? null;
  }, [board, activeDragId]);

  function handleDragStart(e: DragStartEvent) {
    setActiveDragId(String(e.active.id));
  }

  function handleDragOver(_e: DragOverEvent) {
    // We compute the final destination only on drop to avoid jitter.
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveDragId(null);
    if (!board) return;
    const { active, over } = e;
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);
    const sourceTask = board.tasks.find((t) => t.id === taskId);
    if (!sourceTask) return;

    // The droppable id is either a column id (when dropped on an empty
    // area) or another task id (when dropped on a card). Resolve both.
    let toColumnId: string;
    let toIndex = 0;
    if (board.columns.some((c) => c.id === overId)) {
      toColumnId = overId;
      toIndex = (tasksByColumn[toColumnId] ?? []).length;
      if (toColumnId === sourceTask.columnId) {
        toIndex = Math.max(0, toIndex - 1);
      }
    } else {
      const targetTask = board.tasks.find((t) => t.id === overId);
      if (!targetTask) return;
      toColumnId = targetTask.columnId;
      const col = tasksByColumn[toColumnId] ?? [];
      const idxOfTarget = col.findIndex((t) => t.id === targetTask.id);
      toIndex = idxOfTarget < 0 ? col.length : idxOfTarget;
    }

    // Optimistic move: shuffle local state first, then call the API.
    const previous = board;
    setBoard((b) => {
      if (!b) return b;
      const tasks = b.tasks.map((t) => ({ ...t }));
      const moving = tasks.find((t) => t.id === taskId);
      if (!moving) return b;

      // Strip from current column
      for (const t of tasks) {
        if (t.columnId === moving.columnId && t.position > moving.position) {
          t.position -= 1;
        }
      }
      // Bump destination column at insert index
      for (const t of tasks) {
        if (t.columnId === toColumnId && t.position >= toIndex && t.id !== moving.id) {
          t.position += 1;
        }
      }
      moving.columnId = toColumnId;
      moving.position = toIndex;
      return { ...b, tasks };
    });

    try {
      const r = await fetch(`/api/tasks/tasks/${taskId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toColumnId, toIndex }),
      });
      if (!r.ok) {
        setBoard(previous);
        const j = await r.json().catch(() => ({}));
        setError(typeof j?.error === "string" ? j.error : "Failed to move task.");
      }
    } catch (err) {
      setBoard(previous);
      setError(err instanceof Error ? err.message : "Network error.");
    }
  }

  function openTask(taskId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("task", taskId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }
  function closeTask() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("task");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function clearFilters() {
    setSearch("");
    setFilterAssignee("all");
    setFilterPriority("all");
    setFilterLabel("all");
    setFilterDue("all");
  }

  const filtersActive =
    !!search ||
    filterAssignee !== "all" ||
    filterPriority !== "all" ||
    filterLabel !== "all" ||
    filterDue !== "all";

  return (
    <div className="space-y-4">
      {/* Board switcher */}
      <div className="flex flex-wrap items-center gap-2">
        {boards.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setActiveBoardId(b.id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              activeBoardId === b.id
                ? "brand-keep border-brand bg-brand text-white"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
            }`}
          >
            {b.icon ? <span>{b.icon}</span> : null}
            <span>{b.name}</span>
            <span className="ml-1 rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
              {b.taskCount}
            </span>
          </button>
        ))}
        {isAdmin && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const name = prompt(t("tasks.newBoard.prompt"));
              if (!name) return;
              void fetch("/api/tasks/boards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
              })
                .then((r) => {
                  if (r.ok) void loadBoards();
                })
                .catch(() => undefined);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("tasks.newBoard")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[14rem]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("tasks.search.placeholder")}
              className="pl-7"
            />
          </div>
          <FilterIcon className="h-3.5 w-3.5 text-zinc-500" />
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
          >
            <option value="all">{t("tasks.filter.assignee.all")}</option>
            <option value="unassigned">{t("tasks.filter.assignee.unassigned")}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as Priority | "all")}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
          >
            {(["all", "URGENT", "HIGH", "NORMAL", "LOW"] as const).map((p) => (
              <option key={p} value={p}>
                {t(PRIORITY_LABELS[p])}
              </option>
            ))}
          </select>
          <select
            value={filterLabel}
            onChange={(e) => setFilterLabel(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
          >
            <option value="all">{t("tasks.filter.label.all")}</option>
            {board?.labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            value={filterDue}
            onChange={(e) =>
              setFilterDue(e.target.value as "all" | "today" | "this_week" | "overdue")
            }
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
          >
            <option value="all">{t("tasks.filter.due.all")}</option>
            <option value="overdue">{t("tasks.filter.due.overdue")}</option>
            <option value="today">{t("tasks.filter.due.today")}</option>
            <option value="this_week">{t("tasks.filter.due.this_week")}</option>
          </select>
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {t("tasks.filter.clear")}
            </Button>
          )}
        </div>
      </Card>

      {error && (
        <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Kanban board */}
      {!board && loadingBoard && (
        <p className="text-sm text-zinc-500 py-12 text-center">{t("common.loading")}…</p>
      )}
      {board && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
            {board.columns.map((col) => {
              const items = tasksByColumn[col.id] ?? [];
              return (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  count={items.length}
                  onAddTask={() => setNewTaskColumnId(col.id)}
                >
                  <SortableContext
                    items={items.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {items.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onOpen={() => openTask(task.id)}
                      />
                    ))}
                  </SortableContext>
                </KanbanColumn>
              );
            })}
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="rotate-1 opacity-90">
                <TaskCard task={activeTask} onOpen={() => undefined} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Detail drawer */}
      {openTaskId && (
        <TaskDetailDrawer
          taskId={openTaskId}
          users={users}
          board={board}
          onClose={() => closeTask()}
          onChanged={() => activeBoardId && void loadBoard(activeBoardId)}
        />
      )}

      {/* New task dialog */}
      {newTaskColumnId && board && (
        <NewTaskDialog
          board={board}
          defaultColumnId={newTaskColumnId}
          users={users}
          onClose={() => setNewTaskColumnId(null)}
          onCreated={() => {
            setNewTaskColumnId(null);
            if (activeBoardId) void loadBoard(activeBoardId);
          }}
        />
      )}
    </div>
  );
}
