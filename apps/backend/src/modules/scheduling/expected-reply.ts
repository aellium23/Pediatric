/**
 * Honest reply expectation for async (message) consultations.
 *
 * The pediatrician's MESSAGES availability defines when the reply clock runs:
 * `targetHours` are counted only INSIDE message windows, starting at `from`.
 * Dated blocks override the weekly template on their day (same rule as video
 * slots). Returns the moment the accumulated in-window time reaches the
 * target, or null when the pediatrician has no message windows at all (the
 * caller falls back to the wall-clock SLA).
 *
 * Pure function — callers pass the pediatrician's availability rows.
 */
export interface AvailabilityRow {
  kind: string; // 'VIDEO' | 'MESSAGES'
  weekday: number; // 0=Sunday .. 6=Saturday (UTC)
  startMinute: number;
  endMinute: number;
  date: Date | null; // midnight UTC when dated; null = weekly template
}

const DAY_MS = 24 * 3600 * 1000;
const HORIZON_DAYS = 28;

export function computeExpectedReplyAt(
  rows: AvailabilityRow[],
  targetHours: number,
  from: Date,
): Date | null {
  const windows = rows.filter((r) => r.kind === 'MESSAGES');
  if (!windows.length) return null;

  const dated = new Map<string, AvailabilityRow[]>();
  const weekly = new Map<number, AvailabilityRow[]>();
  for (const w of windows) {
    if (w.date) {
      const key = w.date.toISOString().slice(0, 10);
      dated.set(key, [...(dated.get(key) ?? []), w]);
    } else {
      weekly.set(w.weekday, [...(weekly.get(w.weekday) ?? []), w]);
    }
  }

  let remainingMs = Math.max(targetHours, 0) * 3600 * 1000;
  if (remainingMs === 0) return from;

  const dayStart0 = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const dayStart = dayStart0 + i * DAY_MS;
    const day = new Date(dayStart);
    const key = day.toISOString().slice(0, 10);
    const blocks = dated.get(key) ?? weekly.get(day.getUTCDay()) ?? [];
    for (const b of [...blocks].sort((a, z) => a.startMinute - z.startMinute)) {
      const winStart = dayStart + b.startMinute * 60_000;
      const winEnd = dayStart + b.endMinute * 60_000;
      const start = Math.max(winStart, from.getTime());
      if (winEnd <= start) continue;
      const span = winEnd - start;
      if (span >= remainingMs) return new Date(start + remainingMs);
      remainingMs -= span;
    }
  }
  return null; // windows too sparse to reach the target inside the horizon
}
