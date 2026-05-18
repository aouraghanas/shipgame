"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  CheckSquare,
  MessageCircle,
  AlertOctagon,
  Flame,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { Priority, TaskLite } from "./types";
import { Avatar } from "./Avatar";

const PRIORITY_BG: Record<Priority, string> = {
  URGENT: "bg-red-500/15 text-red-300 border-red-500/40",
  HIGH: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  NORMAL: "bg-zinc-700/40 text-zinc-300 border-zinc-700",
  LOW: "bg-zinc-800/60 text-zinc-400 border-zinc-800",
};

function PriorityIcon({ p }: { p: Priority }) {
  const cls = "h-3 w-3";
  if (p === "URGENT") return <AlertOctagon className={cls} />;
  if (p === "HIGH") return <Flame className={cls} />;
  if (p === "NORMAL") return <ArrowUp className={cls} />;
  return <ArrowDown className={cls} />;
}

function dueClass(due: string | null): string {
  if (!due) return "text-zinc-500";
  const now = new Date();
  const d = new Date(due);
  if (d < now) return "text-red-400";
  const days = (d.getTime() - now.getTime()) / 86400000;
  if (days < 2) return "text-amber-400";
  return "text-zinc-400";
}

export function TaskCard({
  task,
  onOpen,
}: {
  task: TaskLite;
  onOpen: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Only treat as click if not coming from a drag end.
        if ((e.target as HTMLElement).closest("[data-drag-handle]")) return;
        onOpen();
      }}
      className={`group cursor-pointer select-none rounded-lg border border-zinc-800 bg-zinc-900 p-2.5 shadow-sm transition-shadow hover:border-zinc-700 hover:shadow-md ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {task.labels.map((l) => (
            <span
              key={l.id}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                background: (l.color ?? "#64748b") + "33",
                color: l.color ?? "#94a3b8",
              }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}

      <p className="text-sm font-medium text-zinc-100 leading-snug">
        {task.title}
      </p>

      {task.description && (
        <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
        <span
          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${
            PRIORITY_BG[task.priority]
          }`}
        >
          <PriorityIcon p={task.priority} />
          {task.priority}
        </span>

        {task.dueAt && (
          <span
            className={`inline-flex items-center gap-1 ${dueClass(task.dueAt)}`}
          >
            <CalendarDays className="h-3 w-3" />
            {new Date(task.dueAt).toLocaleDateString()}
          </span>
        )}

        {task.checklistTotal > 0 && (
          <span className="inline-flex items-center gap-1">
            <CheckSquare className="h-3 w-3" />
            {task.checklistDone}/{task.checklistTotal}
          </span>
        )}

        {task.commentCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {task.commentCount}
          </span>
        )}

        <div className="ml-auto flex -space-x-1.5">
          {task.assignees.slice(0, 3).map((a) => (
            <Avatar key={a.id} user={a} size="sm" />
          ))}
          {task.assignees.length > 3 && (
            <span className="z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-800 text-[10px] text-zinc-300">
              +{task.assignees.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
