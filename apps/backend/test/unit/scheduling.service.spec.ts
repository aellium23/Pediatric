import { BadRequestException } from '@nestjs/common';
import { SchedulingService } from '../../src/modules/scheduling/scheduling.service';

function build(blocks: any[], booked: any[] = []) {
  const prisma: any = {
    availability: { findMany: jest.fn().mockResolvedValue(blocks) },
    videoSession: { findMany: jest.fn().mockResolvedValue(booked) },
  };
  return new SchedulingService(prisma, {} as any, {} as any);
}

describe('SchedulingService.slots', () => {
  it('generates slots within an availability block (excluding the block end)', async () => {
    // 10:00–11:00 UTC, 20-minute slots → 10:00, 10:20, 10:40
    const service = build([
      { startMinute: 600, endMinute: 660, slotMinutes: 20 },
    ]);
    const slots = await service.slots('p1', '2999-01-01');
    expect(slots).toEqual([
      '2999-01-01T10:00:00.000Z',
      '2999-01-01T10:20:00.000Z',
      '2999-01-01T10:40:00.000Z',
    ]);
  });

  it('excludes already-booked slots', async () => {
    const service = build(
      [{ startMinute: 600, endMinute: 660, slotMinutes: 20 }],
      [{ scheduledAt: new Date('2999-01-01T10:20:00.000Z') }],
    );
    const slots = await service.slots('p1', '2999-01-01');
    expect(slots).toEqual([
      '2999-01-01T10:00:00.000Z',
      '2999-01-01T10:40:00.000Z',
    ]);
  });

  it('rejects an invalid date', async () => {
    const service = build([]);
    await expect(service.slots('p1', 'not-a-date')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SchedulingService.nextSlots', () => {
  it('returns only upcoming days that have free slots', async () => {
    // Availability on every weekday → the two future days always yield slots;
    // today is included only when the current UTC time is before the block, so
    // assert a 2–3 range rather than an exact count (avoids a time-of-day flake).
    const service = build([{ startMinute: 600, endMinute: 660, slotMinutes: 20 }]);
    const days = await service.nextSlots('p1', 3);
    expect(days.length).toBeGreaterThanOrEqual(2);
    expect(days.length).toBeLessThanOrEqual(3);
    for (const d of days) {
      expect(d.slots.length).toBeGreaterThan(0);
      expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('skips days without availability', async () => {
    const service = build([]); // no blocks → no slots on any day
    const days = await service.nextSlots('p1', 5);
    expect(days).toEqual([]);
  });
});
