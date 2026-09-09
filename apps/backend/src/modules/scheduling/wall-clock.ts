/**
 * Wall-clock → UTC conversion for pediatrician availability.
 *
 * Availability rows store minutes past midnight as WALL-CLOCK time in the
 * pediatrician's IANA timezone (Pediatrician.timezone). Booked instants
 * (scheduledAt, slaDueAt, expectedReplyAt…) are real UTC instants. These
 * helpers convert between the two using plain Intl (Node 22 ships full ICU),
 * with no timezone library dependency.
 */

const BadTz = (tz: string) => new Error(`Invalid IANA timezone: ${tz}`);

/** True when `tz` is a timezone name Intl can resolve (e.g. "Europe/Lisbon"). */
export function isValidTimeZone(tz: string): boolean {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** UTC-offset of `tz` at the given instant, in minutes (e.g. Lisbon summer = +60). */
function offsetMinutesAt(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'longOffset',
  }).formatToParts(instant);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  // "GMT" (UTC itself) or "GMT±HH:MM".
  const m = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(name);
  if (!m) throw new Error(`Unparseable offset "${name}" for timezone ${tz}`);
  if (!m[1]) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}

/**
 * The UTC instant at which the wall clock in `tz` shows `minute` minutes past
 * midnight on the calendar day `dateISO` (YYYY-MM-DD).
 *
 * Algorithm: guess the instant as if the wall time were UTC, read the zone's
 * offset at that guess, subtract it, and re-check once (two iterations always
 * converge for real-world zones, whose offsets change by at most 1–2h).
 *
 * DST edge cases:
 * - Spring-forward gap (the local time does not exist, e.g. Lisbon
 *   2026-03-29 01:30): we return the corrected instant anyway, which lands
 *   just past the gap (the slot effectively "skips forward"). No throw.
 * - Fall-back overlap (the local time exists twice): one of the two
 *   occurrences is returned deterministically (whichever offset the naive
 *   guess converges on) — fine for 20-minute consultation slots.
 *
 * Returns null for a malformed date string; throws for an invalid timezone.
 */
export function wallClockToUTC(dateISO: string, minute: number, tz: string): Date | null {
  if (!isValidTimeZone(tz)) throw BadTz(tz);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const base = Date.UTC(y, mo - 1, d, 0, minute);
  if (Number.isNaN(base)) return null;

  // Iteration 1: correct by the offset at the naive guess.
  let guess = base - offsetMinutesAt(new Date(base), tz) * 60_000;
  // Iteration 2: the offset may differ at the corrected instant (near a DST
  // transition) — correct once more; if it still disagrees we are inside a
  // spring-forward gap and keep the (skipped-forward) result.
  const off2 = offsetMinutesAt(new Date(guess), tz);
  if (guess + off2 * 60_000 !== base) {
    guess = base - off2 * 60_000;
  }
  return new Date(guess);
}

/** The LOCAL calendar day (YYYY-MM-DD) that `instant` falls on in `tz`. */
export function localISODay(instant: Date, tz: string): string {
  if (!isValidTimeZone(tz)) throw BadTz(tz);
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/**
 * The UTC window [start, end) covering the LOCAL calendar day `dateISO` in
 * `tz` — i.e. local midnight to the next local midnight. Used to query booked
 * sessions clashing with slots generated for that local day.
 */
export function utcDayWindowLocal(dateISO: string, tz: string): { start: Date; end: Date } {
  const start = wallClockToUTC(dateISO, 0, tz);
  // 1440 minutes past local midnight = next local midnight (Date.UTC carries
  // the overflow into the next day, and the offset is re-read there, so DST
  // days are correctly 23h or 25h long).
  const end = wallClockToUTC(dateISO, 1440, tz);
  if (!start || !end) throw new Error(`Invalid date "${dateISO}"`);
  return { start, end };
}
