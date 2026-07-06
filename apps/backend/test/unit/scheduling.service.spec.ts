import { BadRequestException } from '@nestjs/common';
import { ConsentSubject } from '@prisma/client';
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

describe('SchedulingService.slots — dated blocks override the weekly template', () => {
  it('uses only dated blocks when the day has one', async () => {
    const findMany = jest
      .fn()
      // 1st call: dated blocks for the day
      .mockResolvedValueOnce([{ startMinute: 600, endMinute: 640, slotMinutes: 20 }]);
    const prisma: any = {
      availability: { findMany },
      videoSession: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new SchedulingService(prisma, {} as any, {} as any);
    const slots = await service.slots('p1', '2999-01-01');
    expect(slots).toEqual(['2999-01-01T10:00:00.000Z', '2999-01-01T10:20:00.000Z']);
    // Template query never ran — the dated blocks satisfied the day.
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].where.date).toEqual(new Date('2999-01-01T00:00:00.000Z'));
  });

  it('falls back to the weekly template when the day has no dated block', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([]) // no dated blocks
      .mockResolvedValueOnce([{ startMinute: 600, endMinute: 640, slotMinutes: 20 }]);
    const prisma: any = {
      availability: { findMany },
      videoSession: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new SchedulingService(prisma, {} as any, {} as any);
    const slots = await service.slots('p1', '2999-01-01');
    expect(slots).toEqual(['2999-01-01T10:00:00.000Z', '2999-01-01T10:20:00.000Z']);
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany.mock.calls[1][0].where).toMatchObject({ date: null });
  });
});

describe('SchedulingService.setAvailability — dated blocks', () => {
  function buildSet() {
    const created: any[] = [];
    const prisma: any = {
      pediatrician: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'ped1' }) },
      availability: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const row = { id: `a${created.length + 1}`, ...data };
          created.push(row);
          return Promise.resolve(row);
        }),
      },
      $transaction: jest.fn(async (ops: Promise<any>[]) => Promise.all(ops)),
    };
    return { service: new SchedulingService(prisma, {} as any, {} as any), prisma, created };
  }

  it('creates one dated block with the weekday derived from the date', async () => {
    const { service, created } = buildSet();
    await service.setAvailability('u1', {
      date: '2999-01-04', // a Friday
      startMinute: 540,
      endMinute: 720,
    } as any);
    expect(created).toHaveLength(1);
    expect(created[0].date).toEqual(new Date('2999-01-04T00:00:00.000Z'));
    expect(created[0].weekday).toBe(new Date('2999-01-04T00:00:00.000Z').getUTCDay());
  });

  it('repeatWeeks creates the same block for consecutive weeks', async () => {
    const { service, created } = buildSet();
    const res = await service.setAvailability('u1', {
      date: '2999-01-04',
      startMinute: 540,
      endMinute: 720,
      repeatWeeks: 3,
    } as any);
    expect(created.map((r) => r.date.toISOString().slice(0, 10))).toEqual([
      '2999-01-04',
      '2999-01-11',
      '2999-01-18',
    ]);
    expect(Array.isArray(res)).toBe(true);
  });

  it('rejects when neither weekday nor date is given', async () => {
    const { service } = buildSet();
    await expect(
      service.setAvailability('u1', { startMinute: 540, endMinute: 720 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SchedulingService.book — health-data consent', () => {
  // A future timestamp aligned to a 20-minute slot boundary (so it matches a
  // generated slot when availability covers the whole day).
  function futureSlot(): string {
    const day = new Date(Date.now() + 3 * 86_400_000);
    return new Date(`${day.toISOString().slice(0, 10)}T12:00:00.000Z`).toISOString();
  }
  function bookService(existingHealthConsent: unknown, availability: any[] = [{ startMinute: 0, endMinute: 1440, slotMinutes: 20 }]) {
    const prisma: any = {
      child: { findUnique: jest.fn().mockResolvedValue({ id: 'ch1', familyId: 'f1' }) },
      familyMember: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
      consent: { findFirst: jest.fn().mockResolvedValue(existingHealthConsent) },
      pediatricianService: {
        findFirstOrThrow: jest
          .fn()
          .mockResolvedValue({ id: 's1', pediatricianId: 'p1', priceCents: 4500, currency: 'EUR', scopeText: null }),
      },
      availability: { findMany: jest.fn().mockResolvedValue(availability) },
      consultation: { create: jest.fn().mockResolvedValue({ id: 'c1' }) },
      videoSession: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ roomId: 'r1' }),
      },
    };
    // Interactive transaction: run the callback against the same mock client.
    prisma.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));
    const consent: any = { record: jest.fn().mockResolvedValue(undefined) };
    const payments: any = {
      createIntentForConsultation: jest.fn().mockResolvedValue({ clientSecret: 'cs' }),
    };
    return { service: new SchedulingService(prisma, consent, payments), consent };
  }
  const dto = () => ({ childId: 'ch1', serviceId: 's1', scheduledAt: futureSlot(), teleconsultConsent: true });

  it('records a health-data consent when missing (self-heal for a verified guardian)', async () => {
    const { service, consent } = bookService(null);
    const res = await service.book('u1', dto());
    expect(res.consultationId).toBe('c1');
    const subjects = consent.record.mock.calls.map((c: unknown[]) => c[1]);
    expect(subjects).toContain(ConsentSubject.HEALTH_DATA);
    expect(subjects).toContain(ConsentSubject.TELECONSULT);
  });

  it('does not duplicate the health-data consent when one already exists', async () => {
    const { service, consent } = bookService({ id: 'existing' });
    await service.book('u1', dto());
    const subjects = consent.record.mock.calls.map((c: unknown[]) => c[1]);
    expect(subjects).not.toContain(ConsentSubject.HEALTH_DATA);
    expect(subjects).toContain(ConsentSubject.TELECONSULT);
  });

  it('rejects booking without teleconsultation consent', async () => {
    const { service } = bookService({ id: 'existing' });
    await expect(
      service.book('u1', { ...dto(), teleconsultConsent: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a slot outside the pediatrician availability', async () => {
    const { service } = bookService({ id: 'existing' }, []); // no availability → no slots
    await expect(service.book('u1', dto())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when another booking wins the race inside the transaction', async () => {
    const { service } = bookService({ id: 'existing' });
    // The atomic re-check finds a clash created between slots() and the txn.
    ((service as any).prisma.videoSession.findFirst as jest.Mock).mockResolvedValue({ id: 'clash' });
    await expect(service.book('u1', dto())).rejects.toBeInstanceOf(BadRequestException);
    expect((service as any).prisma.consultation.create).not.toHaveBeenCalled();
  });
});
