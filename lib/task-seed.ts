/**
 * Seed default boards on first use.
 *
 * Idempotent: runs lazily when the first user opens /tasks. We seed a
 * handful of team-aligned boards ("Sourcing", "Tech", "Operations",
 * "Accounting", "General") each with the standard kanban columns. A
 * couple of starter labels are added so users can immediately tag work.
 */

import { prisma } from "@/lib/prisma";

type ColumnSeed = { name: string; color: string; isDone?: boolean };
type LabelSeed = { name: string; color: string };
type BoardSeed = {
  key: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
  columns: ColumnSeed[];
  labels: LabelSeed[];
};

const DEFAULT_COLUMNS: ColumnSeed[] = [
  { name: "Backlog", color: "#475569" },
  { name: "To do", color: "#64748b" },
  { name: "In progress", color: "#3b82f6" },
  { name: "In review", color: "#a855f7" },
  { name: "Done", color: "#10b981", isDone: true },
];

const DEFAULT_LABELS: LabelSeed[] = [
  { name: "Bug", color: "#ef4444" },
  { name: "Feature", color: "#3b82f6" },
  { name: "Improvement", color: "#a855f7" },
  { name: "Urgent", color: "#f59e0b" },
];

const BOARDS: BoardSeed[] = [
  {
    key: "OPS",
    name: "Operations",
    description: "Day-to-day operations across the company.",
    color: "#3b82f6",
    icon: "🛠️",
    sortOrder: 1,
    columns: DEFAULT_COLUMNS,
    labels: DEFAULT_LABELS,
  },
  {
    key: "SRC",
    name: "Sourcing",
    description: "Sourcing agents — product hunting, supplier follow-ups.",
    color: "#f59e0b",
    icon: "📦",
    sortOrder: 2,
    columns: DEFAULT_COLUMNS,
    labels: DEFAULT_LABELS,
  },
  {
    key: "TECH",
    name: "Tech / Platform",
    description: "Engineering tasks: bugs, features, infra.",
    color: "#a855f7",
    icon: "💻",
    sortOrder: 3,
    columns: DEFAULT_COLUMNS,
    labels: DEFAULT_LABELS,
  },
  {
    key: "FIN",
    name: "Accounting / Finance",
    description: "Bookkeeping, reconciliations, financial follow-ups.",
    color: "#10b981",
    icon: "💰",
    sortOrder: 4,
    columns: DEFAULT_COLUMNS,
    labels: DEFAULT_LABELS,
  },
  {
    key: "GEN",
    name: "General",
    description: "Cross-team or admin items that don't fit a single board.",
    color: "#64748b",
    icon: "📋",
    sortOrder: 5,
    columns: DEFAULT_COLUMNS,
    labels: DEFAULT_LABELS,
  },
];

let seedingInflight: Promise<void> | null = null;

/**
 * Ensure that default boards / columns / labels exist. Safe to call
 * concurrently — we de-duplicate the work inside a single process and
 * rely on the boards' unique `key` for cross-process safety.
 */
export async function ensureDefaultBoards(): Promise<void> {
  if (seedingInflight) return seedingInflight;
  seedingInflight = (async () => {
    try {
      const existingCount = await prisma.taskBoard.count();
      if (existingCount > 0) return;

      for (const b of BOARDS) {
        // upsert keeps it idempotent even if two requests race.
        const board = await prisma.taskBoard.upsert({
          where: { key: b.key },
          create: {
            key: b.key,
            name: b.name,
            description: b.description,
            color: b.color,
            icon: b.icon,
            sortOrder: b.sortOrder,
          },
          update: {},
        });

        // Only create columns if the board has none yet (first-time setup).
        const colCount = await prisma.taskColumn.count({
          where: { boardId: board.id },
        });
        if (colCount === 0) {
          await prisma.taskColumn.createMany({
            data: b.columns.map((c, idx) => ({
              boardId: board.id,
              name: c.name,
              color: c.color,
              position: idx,
              isDone: !!c.isDone,
            })),
          });
        }

        const labelCount = await prisma.taskLabel.count({
          where: { boardId: board.id },
        });
        if (labelCount === 0) {
          for (const l of b.labels) {
            await prisma.taskLabel.upsert({
              where: { boardId_name: { boardId: board.id, name: l.name } },
              create: { boardId: board.id, name: l.name, color: l.color },
              update: {},
            });
          }
        }
      }
    } catch (e) {
      console.error("[task-seed] ensureDefaultBoards failed", e);
    } finally {
      // Allow a retry on the next request after a failure.
      seedingInflight = null;
    }
  })();
  return seedingInflight;
}
