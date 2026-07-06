import {
  computeExpectedReplyAt,
  type AvailabilityRow,
} from '../../src/modules/scheduling/expected-reply';

// Mon–Fri 09:00–19:00 weekly MESSAGES template.
const WEEKDAYS_9_19: AvailabilityRow[] = [1, 2, 3, 4, 5].map((weekday) => ({
  kind: 'MESSAGES',
  weekday,
  startMinute: 9 * 60,
  endMinute: 19 * 60,
  date: null,
}));

describe('computeExpectedReplyAt', () => {
  it('returns null when the pediatrician has no message windows', () => {
    const videoOnly: AvailabilityRow[] = [
      { kind: 'VIDEO', weekday: 1, startMinute: 540, endMinute: 1140, date: null },
    ];
    expect(computeExpectedReplyAt(videoOnly, 4, new Date('2999-01-06T03:00:00.000Z'))).toBeNull();
  });

  it('03:00 on a Wednesday with Mon–Fri 9h–19h windows → same day 13:00 (the worked example)', () => {
    // 2999-01-09 is a Wednesday (UTC).
    const from = new Date('2999-01-09T03:00:00.000Z');
    expect(new Date('2999-01-09').getUTCDay()).toBe(3);
    const out = computeExpectedReplyAt(WEEKDAYS_9_19, 4, from);
    expect(out?.toISOString()).toBe('2999-01-09T13:00:00.000Z');
  });

  it('inside a window, the target counts from now', () => {
    const from = new Date('2999-01-09T10:00:00.000Z'); // Wed 10:00
    const out = computeExpectedReplyAt(WEEKDAYS_9_19, 4, from);
    expect(out?.toISOString()).toBe('2999-01-09T14:00:00.000Z');
  });

  it('overflows into the next window day (Friday evening → Monday)', () => {
    // 2999-01-11 is Friday; 18:00 + 4h target → 1h left Friday, 3h Monday.
    const from = new Date('2999-01-11T18:00:00.000Z');
    expect(new Date('2999-01-11').getUTCDay()).toBe(5);
    const out = computeExpectedReplyAt(WEEKDAYS_9_19, 4, from);
    expect(out?.toISOString()).toBe('2999-01-14T12:00:00.000Z'); // Mon 09:00 + 3h
  });

  it('a dated block overrides the weekly template on its day', () => {
    // Wednesday has a dated 14:00–16:00 block → template 9h–19h ignored that day.
    const rows: AvailabilityRow[] = [
      ...WEEKDAYS_9_19,
      {
        kind: 'MESSAGES',
        weekday: 3,
        startMinute: 14 * 60,
        endMinute: 16 * 60,
        date: new Date('2999-01-09T00:00:00.000Z'),
      },
    ];
    const out = computeExpectedReplyAt(rows, 4, new Date('2999-01-09T03:00:00.000Z'));
    // 2h Wed (14–16) + 2h Thu (from 09:00) → Thu 11:00.
    expect(out?.toISOString()).toBe('2999-01-10T11:00:00.000Z');
  });

  it('returns null when windows are too sparse to reach the target in the horizon', () => {
    const tiny: AvailabilityRow[] = [
      { kind: 'MESSAGES', weekday: 1, startMinute: 540, endMinute: 550, date: null },
    ];
    // 10 min/week — 40h target unreachable in 28 days.
    expect(computeExpectedReplyAt(tiny, 40, new Date('2999-01-06T03:00:00.000Z'))).toBeNull();
  });
});
