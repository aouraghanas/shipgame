import type { Role, Status } from "@prisma/client";

export type { Role, Status };

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  deliveredTotal: number;
  stockQty: number;
  stockScore: number;
  deliveredScoreVal: number;
  totalScoreVal: number;
  note: string | null;
};

export type MonthlyScoringDTO = {
  deliveredDivisor: number;
  stockBoundaryMid: number;
  stockBoundaryHigh: number;
  stockPointsLow: number;
  stockPointsMid: number;
  stockPointsHigh: number;
};

export type LeaderboardData = {
  monthKey: string;
  entries: LeaderboardEntry[];
  /** First-place reward (same as rewardTexts[0] when set) */
  rewardText: string | null;
  punishmentText: string | null;
  winnerPlaces: number;
  loserPlaces: number;
  rewardTexts: [string | null, string | null, string | null];
  punishmentTexts: [string | null, string | null];
  scoring: MonthlyScoringDTO;
};

export type UserWithStats = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: Status;
  avatarUrl: string | null;
  createdAt: string;
};

// Extend NextAuth session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      avatarUrl: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    avatarUrl: string | null;
  }
}
