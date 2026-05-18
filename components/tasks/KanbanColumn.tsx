"use client";

import { useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useT } from "@/components/shared/I18nProvider";
import type { ColumnLite } from "./types";

/**
 * A single kanban column. Its body is the droppable surface (so cards
 * land here when dropped on empty space); cards inside it are
 * individually sortable via @dnd-kit/sortable in the parent.
 */
export function KanbanColumn({
  column,
  count,
  onAddTask,
  children,
}: {
  column: ColumnLite;
  count: number;
  onAddTask: () => void;
  children: React.ReactNode;
}) {
  const t = useT();
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const accent = column.color ?? "#475569";
  return (
    <div
      className={`flex h-full min-h-[12rem] w-[20rem] shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-925 transition-colors ${
        isOver ? "bg-zinc-900" : "bg-zinc-900/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
            style={{ background: accent }}
          />
          <span className="font-semibold text-sm text-zinc-100 truncate">
            {column.name}
          </span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
            {count}
          </span>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onAddTask}
          aria-label={t("tasks.newTask")}
          className="h-7 w-7"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 px-2 py-2 space-y-2 overflow-y-auto max-h-[calc(100vh-22rem)]"
      >
        {children}
        {count === 0 && (
          <p className="text-center text-xs text-zinc-600 py-6">
            {t("tasks.column.empty")}
          </p>
        )}
      </div>
    </div>
  );
}
