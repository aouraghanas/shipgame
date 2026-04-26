import type { FeedbackReportPeriod } from "@prisma/client";

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Calendar-aligned ranges (same rules as feedback reports). */
export function getReportRange(period: FeedbackReportPeriod, anchor: Date) {
  const now = new Date(anchor);
  if (period === "DAILY") return { from: startOfDay(now), to: endOfDay(now) };
  if (period === "WEEKLY") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const from = new Date(now);
    from.setDate(now.getDate() + mondayOffset);
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    return { from: startOfDay(from), to: endOfDay(to) };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: startOfDay(from), to: endOfDay(to) };
}

export function sameUtcDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function sameUtcMonth(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

function mondayUtcStartMs(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() - (day - 1));
  t.setUTCHours(0, 0, 0, 0);
  return t.getTime();
}

export function sameUtcWeek(a: Date, b: Date) {
  return mondayUtcStartMs(a) === mondayUtcStartMs(b);
}

/** If true, cron should skip (already ran for this calendar bucket). */
export function shouldSkipAutoRun(last: Date | null, period: FeedbackReportPeriod, now: Date) {
  if (!last) return false;
  if (period === "DAILY") return sameUtcDay(last, now);
  if (period === "WEEKLY") return sameUtcWeek(last, now);
  return sameUtcMonth(last, now);
}
