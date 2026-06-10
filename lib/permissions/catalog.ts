/**
 * Permission catalog.
 *
 * This is the single source of truth for every page/feature in the app and the
 * actions that can be performed inside it. The admin permission editor renders
 * itself from this catalog, and the resolver (resolve.ts) uses it together with
 * the per-role defaults to compute a user's effective permissions.
 *
 * IMPORTANT design rule: this layer is ADDITIVE and must not change how the app
 * behaves for users who have no custom role and no overrides. The role defaults
 * below mirror the access the app already grants today, so an un-customized
 * user resolves to exactly their existing role behavior.
 *
 * A capability key is `feature.action`, e.g. `tickets.create`.
 */

import type { Role } from "@prisma/client";

export type CapabilityAction = {
  /** action id, unique within the feature, e.g. "view" | "create" | "delete" */
  action: string;
  /** human label shown in the editor */
  label: string;
  /** optional help text */
  hint?: string;
};

export type CapabilityFeature = {
  /** feature id, e.g. "tickets" — first segment of the capability key */
  key: string;
  /** human label shown as a section heading in the editor */
  label: string;
  /** the route prefix this feature maps to (for page access enforcement), if any */
  routePrefix?: string;
  actions: CapabilityAction[];
};

/**
 * The catalog. Order here = order in the editor UI.
 *
 * Convention: every feature that is a navigable page has a `view` action; that
 * action doubles as "can open this page". Page-access enforcement keys off the
 * `view` capability + `routePrefix`.
 */
export const CATALOG: CapabilityFeature[] = [
  {
    key: "dashboard",
    label: "Manager dashboard",
    routePrefix: "/dashboard",
    actions: [
      { action: "view", label: "Open dashboard" },
      { action: "enterData", label: "Enter delivered / stock numbers" },
    ],
  },
  {
    key: "leaderboard",
    label: "Leaderboard",
    routePrefix: "/leaderboard",
    actions: [
      { action: "view", label: "View managers leaderboard" },
      { action: "viewCallCenter", label: "View call-center leaderboard" },
    ],
  },
  {
    key: "tickets",
    label: "Tickets",
    routePrefix: "/tickets",
    actions: [
      { action: "view", label: "Open & view tickets" },
      { action: "create", label: "Create tickets" },
      { action: "comment", label: "Comment on tickets" },
      { action: "workflow", label: "Change status / assignee / resolve", hint: "Workflow actions" },
      { action: "editMeta", label: "Edit priority / deadline / details" },
    ],
  },
  {
    key: "tasks",
    label: "Task manager (Kanban)",
    routePrefix: "/tasks",
    actions: [
      { action: "view", label: "Open task boards" },
      { action: "taskEdit", label: "Create / edit / move tasks" },
      { action: "boardCreate", label: "Create boards" },
      { action: "boardSettings", label: "Edit board settings / columns" },
      { action: "boardArchive", label: "Archive boards" },
      { action: "commentModerate", label: "Edit / delete others' comments" },
    ],
  },
  {
    key: "accounting",
    label: "Accounting",
    routePrefix: "/accounting",
    actions: [
      { action: "view", label: "Open accounting" },
      { action: "ledgerCreate", label: "Add ledger lines" },
      { action: "ledgerEdit", label: "Edit / delete past ledger lines" },
      { action: "cashCreate", label: "Add cash-flow operations" },
      { action: "cashDelete", label: "Delete cash-flow operations" },
      { action: "owedEdit", label: "Edit owed-to-sellers" },
      { action: "tools", label: "Use tools (AI report, settings, FX, cities)" },
      { action: "settings", label: "Edit settings / cities / exchange rates" },
    ],
  },
  {
    key: "activity",
    label: "Activity log",
    routePrefix: "/activity",
    actions: [
      { action: "view", label: "View activity" },
      { action: "create", label: "Add activity entries" },
      { action: "viewAll", label: "See everyone's activity (not just own)" },
    ],
  },
  {
    key: "feedback",
    label: "Seller recommendations",
    routePrefix: "/feedback",
    actions: [
      { action: "view", label: "View recommendations" },
      { action: "create", label: "Submit recommendations" },
      { action: "viewAll", label: "See everyone's recommendations" },
    ],
  },
  {
    key: "opsReports",
    label: "Ops activity intel",
    routePrefix: "/ops-reports",
    actions: [
      { action: "view", label: "View ops reports" },
      { action: "generate", label: "Generate ops reports" },
    ],
  },
  {
    key: "confirmation",
    label: "Call center (confirmation)",
    routePrefix: "/confirmation",
    actions: [
      { action: "view", label: "Open confirmation dashboard" },
      { action: "enterData", label: "Enter treated / confirmed / delivered" },
      { action: "activity", label: "Log order activity" },
      { action: "feedback", label: "Submit order recommendations" },
    ],
  },
  {
    key: "users",
    label: "Users administration",
    routePrefix: "/admin/users",
    actions: [
      { action: "view", label: "View users" },
      { action: "create", label: "Create users" },
      { action: "edit", label: "Edit users (role, status, permissions)" },
      { action: "delete", label: "Delete users" },
    ],
  },
  {
    key: "rewards",
    label: "Rewards & scoring",
    routePrefix: "/admin/rewards",
    actions: [
      { action: "view", label: "View rewards config" },
      { action: "edit", label: "Edit rewards / scoring" },
    ],
  },
  {
    key: "reports",
    label: "Reports (admin)",
    routePrefix: "/admin/reports",
    actions: [
      { action: "view", label: "View reports" },
      { action: "generate", label: "Generate reports" },
    ],
  },
  {
    key: "performance",
    label: "Performance override",
    routePrefix: "/admin/performance",
    actions: [
      { action: "view", label: "Open performance admin" },
      { action: "editAny", label: "Edit any user's numbers" },
    ],
  },
  {
    key: "adminFeedback",
    label: "Recommendations intel (admin)",
    routePrefix: "/admin/feedback",
    actions: [{ action: "view", label: "View all recommendations intel" }],
  },
  {
    key: "notifications",
    label: "Notification bars",
    routePrefix: "/admin/notifications",
    actions: [
      { action: "view", label: "View notification bars" },
      { action: "manage", label: "Create / edit / delete bars" },
    ],
  },
  {
    key: "appNotifications",
    label: "App notifications (push)",
    routePrefix: "/admin/app-notifications",
    actions: [
      { action: "view", label: "Open app notifications" },
      { action: "send", label: "Send push campaigns" },
    ],
  },
  {
    key: "adminActivity",
    label: "Audit log (admin)",
    routePrefix: "/admin/activity",
    actions: [{ action: "view", label: "View audit log" }],
  },
];

/** All valid capability keys, e.g. ["tickets.view","tickets.create",...]. */
export const ALL_CAPABILITIES: string[] = CATALOG.flatMap((f) =>
  f.actions.map((a) => `${f.key}.${a.action}`)
);

export function isValidCapability(cap: string): boolean {
  return ALL_CAPABILITIES.includes(cap);
}

/** Map feature key -> route prefix (for page-access enforcement). */
export const FEATURE_ROUTE_PREFIX: Record<string, string | undefined> =
  Object.fromEntries(CATALOG.map((f) => [f.key, f.routePrefix]));

/**
 * Resolve the `view` capability that gates a given href, or null if the route
 * isn't a catalog feature (e.g. /profile) and therefore should never be hidden
 * by the permission layer. Longest prefix wins.
 */
export function viewCapForHref(href: string): string | null {
  const sorted = CATALOG.filter((f) => f.routePrefix).sort(
    (a, b) => (b.routePrefix as string).length - (a.routePrefix as string).length
  );
  for (const f of sorted) {
    const p = f.routePrefix as string;
    if (href === p || href.startsWith(`${p}/`)) return `${f.key}.view`;
  }
  return null;
}

/**
 * Default capabilities granted by each base role. These mirror the app's
 * existing behavior so that an un-customized user resolves to exactly what
 * they can do today.
 *
 * Use "*" to mean "every capability" (ADMIN).
 */
export const ROLE_DEFAULTS: Record<Role, string[] | ["*"]> = {
  ADMIN: ["*"],

  MANAGER: [
    "dashboard.view",
    "dashboard.enterData",
    "leaderboard.view",
    "tickets.view",
    "tickets.create",
    "tickets.comment",
    "tickets.editMeta",
    "tasks.view",
    "tasks.taskEdit",
    "tasks.commentModerate", // own comments only (enforced separately)
    "activity.view",
    "activity.create",
    "feedback.view",
    "feedback.create",
  ],

  ACCOUNTANT: [
    "accounting.view",
    "accounting.ledgerCreate",
    "accounting.cashCreate",
    "accounting.owedEdit",
    "accounting.tools",
    "tickets.view",
    "tickets.create",
    "tickets.comment",
    "tickets.workflow",
    "tasks.view",
    "tasks.taskEdit",
  ],

  LIBYAN_ACCOUNTANT: [
    "accounting.view",
    "accounting.ledgerCreate",
    "accounting.cashCreate",
    "accounting.owedEdit",
  ],

  SOURCING_AGENT: [
    "tickets.view",
    "tickets.create",
    "tickets.comment",
    "tickets.workflow",
    "tasks.view",
    "tasks.taskEdit",
    "feedback.view",
    "opsReports.view",
  ],

  TASK_AGENT: ["tasks.view", "tasks.taskEdit"],

  CONFIRMATION_AGENT: [
    "confirmation.view",
    "confirmation.enterData",
    "confirmation.activity",
    "confirmation.feedback",
    "leaderboard.viewCallCenter",
    "tickets.view",
    "tickets.create",
    "tickets.comment",
    "tasks.view",
    "tasks.taskEdit",
  ],

  SCREEN: ["leaderboard.view"],

  CONFIRMATION_SCREEN: ["leaderboard.viewCallCenter"],
};
