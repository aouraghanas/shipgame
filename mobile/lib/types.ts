/**
 * Shapes returned by the Shipeh backend, kept as plain types for the mobile
 * app. These mirror the Prisma + API responses; if the web side adds a
 * field, just add it here as optional and the app stays compatible.
 */

export type Role =
  | "ADMIN"
  | "MANAGER"
  | "SOURCING_AGENT"
  | "ACCOUNTANT"
  | "LIBYAN_ACCOUNTANT"
  | "SCREEN";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
  avatarUrl: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "ARCHIVED";
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface TicketRow {
  id: string;
  title: string;
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  recipient: string;
  createdAt: string;
  deadlineAt: string | null;
  createdBy: { id: string; name: string };
  assignee: { id?: string; name: string } | null;
  seller: { id?: string; name: string } | null;
  sellerNameText: string | null;
  _count: { attachments: number; comments: number };
}

export interface TicketComment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string; role?: Role };
}

export interface TicketDetail extends TicketRow {
  description: string;
  comments: TicketComment[];
  attachments: { id: string; name: string; url: string; sizeBytes: number }[];
  resolutionNote: string | null;
}

export interface TicketSummary {
  byStatus: Record<TicketStatus, number>;
  total: number;
  openPipeline: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  deliveredTotal: number;
  stockQty: number;
  totalScoreVal: number;
  note: string | null;
}

export interface LeaderboardData {
  monthKey: string;
  entries: LeaderboardEntry[];
  rewardText: string | null;
  punishmentText: string | null;
  winnerPlaces: number;
  loserPlaces: number;
  rewardTexts: (string | null)[];
  punishmentTexts: (string | null)[];
  leaderboardDesign: "CLASSIC" | "ARENA";
}
