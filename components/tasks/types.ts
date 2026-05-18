export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type UserLite = {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string | null;
};

export type LabelLite = {
  id: string;
  name: string;
  color: string | null;
};

export type ColumnLite = {
  id: string;
  boardId: string;
  name: string;
  color: string | null;
  position: number;
  isDone: boolean;
};

export type TaskLite = {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: Priority;
  position: number;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  reporter: UserLite | null;
  assignees: UserLite[];
  labels: LabelLite[];
  checklistTotal: number;
  checklistDone: number;
  commentCount: number;
};

export type BoardListItem = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  visibility: "PUBLIC" | "TEAM_ONLY" | "PRIVATE";
  sortOrder: number;
  taskCount: number;
  memberIds: string[];
};

export type BoardWithTasks = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  visibility: "PUBLIC" | "TEAM_ONLY" | "PRIVATE";
  columns: ColumnLite[];
  labels: LabelLite[];
  members: UserLite[];
  tasks: TaskLite[];
};

export type ChecklistItem = {
  id: string;
  taskId: string;
  label: string;
  done: boolean;
  position: number;
  doneAt: string | null;
  doneById: string | null;
};

export type TaskComment = {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  editedAt: string | null;
  createdAt: string;
  author: UserLite;
};

export type TaskActivityRow = {
  id: string;
  taskId: string;
  actorId: string | null;
  kind: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  actor: UserLite | null;
};

export type TaskDetail = TaskLite & {
  checklist: ChecklistItem[];
  comments: TaskComment[];
  activity: TaskActivityRow[];
  column: ColumnLite;
};
