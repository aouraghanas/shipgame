"use client";

import type { UserLite } from "./types";

const COLORS = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#a855f7", "#ec4899", "#06b6d4", "#84cc16",
];

function colorFor(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Small text avatar: initials in a colored circle. Deterministic per
 * user id so the same person always gets the same color.
 */
export function Avatar({
  user,
  size = "md",
}: {
  user: Pick<UserLite, "id" | "name" | "avatarUrl">;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "h-5 w-5 text-[9px]" : size === "lg" ? "h-9 w-9 text-sm" : "h-7 w-7 text-[11px]";
  if (user.avatarUrl) {
    // Use a plain <img> so we don't need next/image config.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt={user.name}
        className={`${dim} rounded-full object-cover border-2 border-zinc-900 bg-zinc-800`}
      />
    );
  }
  return (
    <span
      className={`${dim} flex items-center justify-center rounded-full font-semibold text-white border-2 border-zinc-900`}
      style={{ background: colorFor(user.id) }}
      title={user.name}
    >
      {initials(user.name)}
    </span>
  );
}
