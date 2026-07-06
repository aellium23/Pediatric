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
 * Availability minutes are WALL-CLOCK times in the pediatrician's timezone
 * (`tz`, IANA name): the iteration walks LOCAL calendar days starting from
 * the local day of `from`, and each window's bounds are converted to UTC
 * instants with wallClockToUTC.
 *
 * Pure function — callers pass the pediatrician's availability rows + tz.
 */
import { localISODay, wallClockToUTC } from './wall-clock';

export interface AvailabilityRow {
  kind: string; // 'VIDEO' | 'MESSAGES'
  weekday: number; // 0=Sunday .. 6=Saturday (of the local calendar day)
  startMinute: number;
  endMinute: number;
  date: Date | null; // midnight-UTC day key when dated; null = weekly template
}

const DAY_MS = 24 * 3600 * 1000;
const HORIZON_DAYS = 28;

export function computeExpectedReplyAt(
  rows: AvailabilityRow[],
  targetHours: number,
  from: Date,
  tz: string,
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

  // Local calendar day of `from` in the pediatrician's timezone; subsequent
  // days advance the ISO date itself (calendar arithmetic, no offsets).
  const day0 = Date.parse(`${localISODay(from, tz)}T00:00:00.000Z`);
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const day = new Date(day0 + i * DAY_MS);
    const key = day.toISOString().slice(0, 10);
    // A calendar day's weekday is timezone-independent, so the ISO date's
    // UTC weekday IS the local weekday.
    const blocks = dated.get(key) ?? weekly.get(day.getUTCDay()) ?? [];
    for (const b of [...blocks].sort((a, z) => a.startMinute - z.startMinute)) {
      const winStart = wallClockToUTC(key, b.startMinute, tz)!.getTime();
      const winEnd = wallClockToUTC(key, b.endMinute, tz)!.getTime();
      const start = Math.max(winStart, from.getTime());
      if (winEnd <= start) continue;
      const span = winEnd - start;
      if (span >= remainingMs) return new Date(start + remainingMs);
      remainingMs -= span;
    }
  }
  return null; // windows too sparse to reach the target inside the horizon
}
