import {
  isValidTimeZone,
  localISODay,
  utcDayWindowLocal,
  wallClockToUTC,
} from '../../src/modules/scheduling/wall-clock';

describe('wallClockToUTC', () => {
  it('Europe/Lisbon winter (WET = UTC+0): 09:00 local → 09:00Z', () => {
    const out = wallClockToUTC('2026-01-15', 9 * 60, 'Europe/Lisbon');
    expect(out?.toISOString()).toBe('2026-01-15T09:00:00.000Z');
  });

  it('Europe/Lisbon summer (WEST = UTC+1): 09:00 local → 08:00Z', () => {
    const out = wallClockToUTC('2026-07-15', 9 * 60, 'Europe/Lisbon');
    expect(out?.toISOString()).toBe('2026-07-15T08:00:00.000Z');
  });

  it('Atlantic/Azores winter (UTC-1): 09:00 local → 10:00Z', () => {
    const out = wallClockToUTC('2026-01-15', 9 * 60, 'Atlantic/Azores');
    expect(out?.toISOString()).toBe('2026-01-15T10:00:00.000Z');
  });

  it('Atlantic/Azores summer (UTC+0): 09:00 local → 09:00Z', () => {
    const out = wallClockToUTC('2026-07-15', 9 * 60, 'Atlantic/Azores');
    expect(out?.toISOString()).toBe('2026-07-15T09:00:00.000Z');
  });

  it('Africa/Luanda (no DST, always UTC+1): 13:00 local → 12:00Z, matching 13:00 Lisbon summer', () => {
    const luanda = wallClockToUTC('2026-07-15', 13 * 60, 'Africa/Luanda');
    expect(luanda?.toISOString()).toBe('2026-07-15T12:00:00.000Z');
    // Same instant as 13:00 wall-clock in Lisbon that day (both UTC+1).
    const lisbon = wallClockToUTC('2026-07-15', 13 * 60, 'Europe/Lisbon');
    expect(luanda?.getTime()).toBe(lisbon?.getTime());
  });

  it('DST spring-forward gap: Lisbon 2026-03-29 01:30 does not exist — returns a skipped-forward instant, no crash', () => {
    // Clocks jump 01:00 → 02:00 local at 01:00Z. 01:30 local never happens.
    const out = wallClockToUTC('2026-03-29', 90, 'Europe/Lisbon');
    expect(out).toBeInstanceOf(Date);
    // The result lands at/after the transition instant (01:00Z), never before.
    expect(out!.getTime()).toBeGreaterThanOrEqual(Date.parse('2026-03-29T01:00:00.000Z'));
    // And within the same local day (sanity: not flung far away).
    expect(out!.getTime()).toBeLessThan(Date.parse('2026-03-30T00:00:00.000Z'));
  });

  it('minute 0 and minute 1440 are local midnight and next local midnight', () => {
    expect(wallClockToUTC('2026-07-15', 0, 'Europe/Lisbon')?.toISOString()).toBe(
      '2026-07-14T23:00:00.000Z',
    );
    expect(wallClockToUTC('2026-07-15', 1440, 'Europe/Lisbon')?.toISOString()).toBe(
      '2026-07-15T23:00:00.000Z',
    );
  });

  it('returns null for a malformed date and throws for an invalid timezone', () => {
    expect(wallClockToUTC('not-a-date', 0, 'Europe/Lisbon')).toBeNull();
    expect(() => wallClockToUTC('2026-01-01', 0, 'Not/AZone')).toThrow(/Invalid IANA timezone/);
  });
});

describe('utcDayWindowLocal', () => {
  it('covers local midnight → next local midnight (Lisbon summer)', () => {
    const { start, end } = utcDayWindowLocal('2026-07-15', 'Europe/Lisbon');
    expect(start.toISOString()).toBe('2026-07-14T23:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-15T23:00:00.000Z');
  });

  it('the spring-forward day is only 23h long', () => {
    const { start, end } = utcDayWindowLocal('2026-03-29', 'Europe/Lisbon');
    expect(end.getTime() - start.getTime()).toBe(23 * 3600 * 1000);
  });
});

describe('localISODay', () => {
  it('an instant before UTC midnight is already the next day in a UTC+ zone', () => {
    expect(localISODay(new Date('2026-07-14T23:30:00.000Z'), 'Europe/Lisbon')).toBe('2026-07-15');
    expect(localISODay(new Date('2026-07-14T23:30:00.000Z'), 'UTC')).toBe('2026-07-14');
  });
});

describe('isValidTimeZone', () => {
  it('accepts real IANA names', () => {
    expect(isValidTimeZone('Europe/Lisbon')).toBe(true);
    expect(isValidTimeZone('Atlantic/Azores')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
  });
  it('rejects junk', () => {
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone('Lisboa')).toBe(false);
  });
});
