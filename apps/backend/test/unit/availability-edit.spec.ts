import { BadRequestException, ConflictException } from '@nestjs/common';
import { SchedulingService } from '../../src/modules/scheduling/scheduling.service';

// 2999-01-04 falls on this weekday (a property of the date, timezone-free).
const DAY = '2999-01-04';
const DAY_KEY = new Date(`${DAY}T00:00:00.000Z`);
const WEEKDAY = DAY_KEY.getUTCDay();
const NEXT_WEEK = '2999-01-11';

function session(iso: string, consultationId = 'c1', childName = 'Tomás Mota') {
  return {
    scheduledAt: new Date(iso),
    consultation: { id: consultationId, child: { name: childName } },
  };
}

function videoBlock(over: Record<string, unknown> = {}) {
  return {
    id: 'b1',
    pediatricianId: 'ped1',
    kind: 'VIDEO',
    weekday: WEEKDAY,
    startMinute: 600, // 10:00 wall-clock
    endMinute: 720, // 12:00 wall-clock
    slotMinutes: 20,
    date: null as Date | null,
    ...over,
  };
}

/**
 * Prisma/payments/events mocks following the existing scheduling spec pattern.
 * availability.findMany answers BOTH callers by inspecting the where clause:
 * `date: null` → weekly template siblings; otherwise → dated blocks.
 */
function build(opts: {
  block: any;
  sessions?: any[];
  datedBlocks?: any[];
  siblings?: any[];
  timezone?: string;
}) {
  const tz = opts.timezone ?? 'UTC';
  const prisma: any = {
    pediatrician: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'ped1', timezone: tz }),
      findUnique: jest.fn().mockResolvedValue({ timezone: tz }),
    },
    availability: {
      findUnique: jest.fn().mockResolvedValue(opts.block),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest
        .fn()
        .mockImplementation(({ where }: any) =>
          Promise.resolve(where?.date === null ? (opts.siblings ?? []) : (opts.datedBlocks ?? [])),
        ),
      delete: jest.fn().mockResolvedValue({}),
      create: jest
        .fn()
        .mockImplementation(({ data }: any) => Promise.resolve({ id: 'new', ...data })),
    },
    videoSession: { findMany: jest.fn().mockResolvedValue(opts.sessions ?? []) },
    consultation: { update: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(async (ops: Promise<any>[]) => Promise.all(ops)),
  };
  const payments: any = { refundForConsultation: jest.fn().mockResolvedValue(undefined) };
  const events: any = { emit: jest.fn() };
  const service = new SchedulingService(prisma, {} as any, payments, events);
  return { service, prisma, payments, events };
}

describe('SchedulingService.affectedBookings', () => {
  it('flags a future booking inside a dated block window (initials, never full name)', async () => {
    const block = videoBlock({ date: DAY_KEY });
    const { service } = build({ block, sessions: [session(`${DAY}T10:30:00.000Z`)] });
    const affected = await service.affectedBookings('ped1', block as any);
    expect(affected).toEqual([
      {
        consultationId: 'c1',
        scheduledAt: new Date(`${DAY}T10:30:00.000Z`),
        childInitials: 'T.M.',
      },
    ]);
  });

  it('ignores bookings outside the window and on other days', async () => {
    const block = videoBlock({ date: DAY_KEY });
    const { service } = build({
      block,
      sessions: [
        session(`${DAY}T09:00:00.000Z`), // before the window
        session(`${DAY}T12:00:00.000Z`), // window end is exclusive
        session(`${NEXT_WEEK}T10:30:00.000Z`), // same weekday but another date
      ],
    });
    expect(await service.affectedBookings('ped1', block as any)).toEqual([]);
  });

  it('excludes instants still covered by the new window when editing', async () => {
    const block = videoBlock({ date: DAY_KEY });
    const { service } = build({
      block,
      sessions: [
        session(`${DAY}T10:10:00.000Z`, 'cDropped'), // only in the old window
        session(`${DAY}T11:30:00.000Z`, 'cKept'), // still covered by the new one
      ],
    });
    const affected = await service.affectedBookings('ped1', block as any, {
      startMinute: 660,
      endMinute: 720,
    });
    expect(affected.map((a) => a.consultationId)).toEqual(['cDropped']);
  });

  it('recurring block: hits every future weekday date but skips dated-override days', async () => {
    const block = videoBlock(); // date: null → weekly template
    const { service } = build({
      block,
      sessions: [
        session(`${DAY}T10:30:00.000Z`, 'cHit'),
        session(`${NEXT_WEEK}T10:30:00.000Z`, 'cOverridden'),
        session('2999-01-05T10:30:00.000Z', 'cOtherWeekday'),
      ],
      // NEXT_WEEK has a dated VIDEO block → that day is governed by it, not
      // by the template being checked.
      datedBlocks: [{ date: new Date(`${NEXT_WEEK}T00:00:00.000Z`) }],
    });
    const affected = await service.affectedBookings('ped1', block as any);
    expect(affected.map((a) => a.consultationId)).toEqual(['cHit']);
  });

  it('converts the wall-clock window per date in the pediatrician timezone', async () => {
    // Lisbon summer (UTC+1): local 10:00–12:00 = 09:00Z–11:00Z.
    const block = videoBlock({ date: new Date('2999-07-15T00:00:00.000Z'), weekday: 0 });
    const { service } = build({
      block,
      timezone: 'Europe/Lisbon',
      sessions: [
        session('2999-07-15T09:30:00.000Z', 'cInside'),
        session('2999-07-15T11:30:00.000Z', 'cOutside'), // 12:30 local
      ],
    });
    const affected = await service.affectedBookings('ped1', block as any);
    expect(affected.map((a) => a.consultationId)).toEqual(['cInside']);
  });
});

describe('SchedulingService.deleteAvailability — booking impact', () => {
  it('409s with the affected list when the VIDEO block has future bookings and no confirm', async () => {
    const block = videoBlock({ date: DAY_KEY });
    const { service, prisma, payments } = build({
      block,
      sessions: [session(`${DAY}T10:30:00.000Z`)],
    });
    let caught: unknown;
    await service.deleteAvailability('u1', 'b1').catch((e) => (caught = e));
    expect(caught).toBeInstanceOf(ConflictException);
    const payload = (caught as ConflictException).getResponse() as any;
    expect(payload.message).toBe('Esta alteração afeta consultas marcadas.');
    expect(payload.affected).toHaveLength(1);
    expect(payload.affected[0]).toMatchObject({ consultationId: 'c1', childInitials: 'T.M.' });
    // Nothing was refunded or deleted.
    expect(payments.refundForConsultation).not.toHaveBeenCalled();
    expect(prisma.availability.delete).not.toHaveBeenCalled();
  });

  it('with confirm: refunds, marks REFUNDED, emits the rebook event, then deletes the block', async () => {
    const block = videoBlock({ date: DAY_KEY });
    const { service, prisma, payments, events } = build({
      block,
      sessions: [session(`${DAY}T10:30:00.000Z`)],
    });
    const res = await service.deleteAvailability('u1', 'b1', true);
    expect(res).toEqual({ deleted: true });
    expect(payments.refundForConsultation).toHaveBeenCalledWith('c1', 'pediatrician_unavailable');
    expect(prisma.consultation.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { status: 'REFUNDED' },
    });
    expect(events.emit).toHaveBeenCalledWith(
      'consultation.rebook_offered',
      expect.objectContaining({ consultationId: 'c1' }),
    );
    expect(prisma.availability.delete).toHaveBeenCalledWith({ where: { id: 'b1' } });
  });

  it('deletes a VIDEO block without ceremony when nothing is booked', async () => {
    const block = videoBlock({ date: DAY_KEY });
    const { service, prisma, payments } = build({ block });
    await service.deleteAvailability('u1', 'b1');
    expect(prisma.availability.delete).toHaveBeenCalled();
    expect(payments.refundForConsultation).not.toHaveBeenCalled();
  });

  it('MESSAGES blocks are always freely removable — no booking check at all', async () => {
    const block = videoBlock({ kind: 'MESSAGES', date: DAY_KEY });
    const { service, prisma } = build({
      block,
      sessions: [session(`${DAY}T10:30:00.000Z`)], // would clash if it were VIDEO
    });
    await service.deleteAvailability('u1', 'b1');
    expect(prisma.videoSession.findMany).not.toHaveBeenCalled();
    expect(prisma.availability.delete).toHaveBeenCalled();
  });
});

describe('SchedulingService.updateAvailability', () => {
  it('rejects an inverted minute range', async () => {
    const { service } = build({ block: videoBlock({ date: DAY_KEY }) });
    await expect(
      service.updateAvailability('u1', 'b1', { startMinute: 700, endMinute: 600 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('dated block: replaces it atomically (delete+create) keeping date and slotMinutes', async () => {
    const block = videoBlock({ date: DAY_KEY });
    const { service, prisma } = build({ block });
    const created = await service.updateAvailability('u1', 'b1', {
      startMinute: 540,
      endMinute: 660,
    } as any);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.availability.delete).toHaveBeenCalledWith({ where: { id: 'b1' } });
    expect(created).toMatchObject({
      pediatricianId: 'ped1',
      kind: 'VIDEO',
      weekday: WEEKDAY,
      startMinute: 540,
      endMinute: 660,
      slotMinutes: 20,
      date: DAY_KEY,
    });
  });

  it('dated block: shrinking the window 409s only for no-longer-covered bookings', async () => {
    const block = videoBlock({ date: DAY_KEY });
    const { service, prisma } = build({
      block,
      sessions: [
        session(`${DAY}T10:10:00.000Z`, 'cDropped'),
        session(`${DAY}T11:30:00.000Z`, 'cKept'),
      ],
    });
    let caught: unknown;
    await service
      .updateAvailability('u1', 'b1', { startMinute: 660, endMinute: 720 } as any)
      .catch((e) => (caught = e));
    expect(caught).toBeInstanceOf(ConflictException);
    const payload = (caught as ConflictException).getResponse() as any;
    expect(payload.affected.map((a: any) => a.consultationId)).toEqual(['cDropped']);
    expect(prisma.availability.delete).not.toHaveBeenCalled();
  });

  it('kind change VIDEO→MESSAGES counts as removing the whole window (full impact)', async () => {
    const block = videoBlock({ date: DAY_KEY });
    const { service } = build({
      block,
      // Same minutes as before — still affected, because the window stops
      // being bookable altogether.
      sessions: [session(`${DAY}T10:30:00.000Z`)],
    });
    await expect(
      service.updateAvailability('u1', 'b1', {
        startMinute: 600,
        endMinute: 720,
        kind: 'MESSAGES',
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('dated block edit with confirm: refunds then recreates the block', async () => {
    const block = videoBlock({ date: DAY_KEY });
    const { service, prisma, payments, events } = build({
      block,
      sessions: [session(`${DAY}T10:10:00.000Z`)],
    });
    const created = await service.updateAvailability('u1', 'b1', {
      startMinute: 660,
      endMinute: 720,
      confirm: true,
    } as any);
    expect(payments.refundForConsultation).toHaveBeenCalledWith('c1', 'pediatrician_unavailable');
    expect(prisma.consultation.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { status: 'REFUNDED' },
    });
    expect(events.emit).toHaveBeenCalledWith('consultation.rebook_offered', expect.anything());
    expect(created).toMatchObject({ startMinute: 660, endMinute: 720, date: DAY_KEY });
  });

  it("recurring + scope 'day': materializes dated copies of ALL same-kind blocks, editing only this one", async () => {
    const block = videoBlock(); // template row
    const sibling = videoBlock({ id: 'b2', startMinute: 840, endMinute: 900, slotMinutes: 30 });
    const { service, prisma } = build({ block, siblings: [block, sibling] });
    const created = (await service.updateAvailability('u1', 'b1', {
      startMinute: 540,
      endMinute: 660,
      scope: 'day',
      date: DAY,
    } as any)) as any[];
    // The template rows are untouched — the day was materialized instead.
    expect(prisma.availability.delete).not.toHaveBeenCalled();
    expect(created).toHaveLength(2);
    expect(created[0]).toMatchObject({ startMinute: 540, endMinute: 660, date: DAY_KEY });
    expect(created[1]).toMatchObject({
      startMinute: 840,
      endMinute: 900,
      slotMinutes: 30,
      date: DAY_KEY,
    });
  });

  it("recurring + scope 'day': impact is checked only for that date", async () => {
    const block = videoBlock();
    const { service } = build({
      block,
      siblings: [block],
      sessions: [
        session(`${DAY}T10:30:00.000Z`, 'cThatDay'),
        session(`${NEXT_WEEK}T10:30:00.000Z`, 'cOtherWeek'), // untouched by a one-day edit
      ],
    });
    let caught: unknown;
    await service
      .updateAvailability('u1', 'b1', {
        startMinute: 660,
        endMinute: 720,
        scope: 'day',
        date: DAY,
      } as any)
      .catch((e) => (caught = e));
    expect(caught).toBeInstanceOf(ConflictException);
    const payload = (caught as ConflictException).getResponse() as any;
    expect(payload.affected.map((a: any) => a.consultationId)).toEqual(['cThatDay']);
  });

  it("recurring + scope 'day' requires a date on the block's weekday", async () => {
    const { service } = build({ block: videoBlock(), siblings: [videoBlock()] });
    await expect(
      service.updateAvailability('u1', 'b1', {
        startMinute: 540,
        endMinute: 660,
        scope: 'day',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateAvailability('u1', 'b1', {
        startMinute: 540,
        endMinute: 660,
        scope: 'day',
        date: '2999-01-05', // not the block's weekday
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("recurring + scope 'all': checks impact across future weekday dates, then replaces the template", async () => {
    const block = videoBlock();
    const { service, prisma, payments } = build({
      block,
      sessions: [
        session(`${DAY}T10:10:00.000Z`, 'cWeek1'),
        session(`${NEXT_WEEK}T10:10:00.000Z`, 'cWeek2'),
      ],
    });
    await expect(
      service.updateAvailability('u1', 'b1', { startMinute: 660, endMinute: 720 } as any),
    ).rejects.toBeInstanceOf(ConflictException);

    const created = await service.updateAvailability('u1', 'b1', {
      startMinute: 660,
      endMinute: 720,
      confirm: true,
    } as any);
    expect(payments.refundForConsultation).toHaveBeenCalledTimes(2);
    expect(prisma.availability.delete).toHaveBeenCalledWith({ where: { id: 'b1' } });
    expect(created).toMatchObject({
      weekday: WEEKDAY,
      startMinute: 660,
      endMinute: 720,
      date: null,
    });
  });

  it('MESSAGES blocks are freely editable — no impact check', async () => {
    const block = videoBlock({ kind: 'MESSAGES', date: DAY_KEY });
    const { service, prisma } = build({
      block,
      sessions: [session(`${DAY}T10:30:00.000Z`)],
    });
    const created = await service.updateAvailability('u1', 'b1', {
      startMinute: 60,
      endMinute: 120,
    } as any);
    expect(prisma.videoSession.findMany).not.toHaveBeenCalled();
    expect(created).toMatchObject({ kind: 'MESSAGES', startMinute: 60, endMinute: 120 });
  });
});
