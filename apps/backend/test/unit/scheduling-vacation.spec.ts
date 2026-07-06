import { BadRequestException, ConflictException } from '@nestjs/common';
import { SchedulingService } from '../../src/modules/scheduling/scheduling.service';
import { PediatriciansService } from '../../src/modules/pediatricians/pediatricians.service';

/**
 * Feature specs: GET /scheduling/my-bookings (pediatrician agenda) and
 * POST /scheduling/unavailability (vacation / closed days), plus the
 * closed-row interactions with deleteAvailability and the marketplace
 * availability queries.
 */

function session(iso: string, consultationId = 'c1', childName = 'Tomás Mota', status = 'OPEN') {
  return {
    scheduledAt: new Date(iso),
    consultation: { id: consultationId, status, child: { name: childName } },
  };
}

function build(opts: {
  sessions?: any[];
  existingClosed?: any[];
  block?: any;
  timezone?: string;
} = {}) {
  const tz = opts.timezone ?? 'UTC';
  const prisma: any = {
    pediatrician: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'ped1', timezone: tz }),
      findUnique: jest.fn().mockResolvedValue({ timezone: tz }),
    },
    availability: {
      findUnique: jest.fn().mockResolvedValue(opts.block ?? null),
      findMany: jest.fn().mockResolvedValue(opts.existingClosed ?? []),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      delete: jest.fn().mockResolvedValue({}),
    },
    videoSession: { findMany: jest.fn().mockResolvedValue(opts.sessions ?? []) },
    consultation: { update: jest.fn().mockResolvedValue({}) },
  };
  const payments: any = { refundForConsultation: jest.fn().mockResolvedValue(undefined) };
  const events: any = { emit: jest.fn() };
  const service = new SchedulingService(prisma, {} as any, payments, events);
  return { service, prisma, payments, events };
}

describe('SchedulingService.myBookings', () => {
  it('returns the agenda shape ordered by scheduledAt, with the FULL child name', async () => {
    const { service, prisma } = build({
      sessions: [
        session('2999-07-10T09:00:00.000Z', 'c1', 'Tomás Mota', 'OPEN'),
        session('2999-07-11T10:00:00.000Z', 'c2', 'Ana Beatriz Silva', 'ANSWERED'),
      ],
    });
    const out = await service.myBookings('u1', '2999-07-10', '2999-07-12');
    expect(out).toEqual([
      {
        consultationId: 'c1',
        scheduledAt: new Date('2999-07-10T09:00:00.000Z'),
        status: 'OPEN',
        childName: 'Tomás Mota',
      },
      {
        consultationId: 'c2',
        scheduledAt: new Date('2999-07-11T10:00:00.000Z'),
        status: 'ANSWERED',
        childName: 'Ana Beatriz Silva',
      },
    ]);
    const args = (prisma.videoSession.findMany as jest.Mock).mock.calls[0][0];
    expect(args.orderBy).toEqual({ scheduledAt: 'asc' });
  });

  it('queries LOCAL-day boundaries in the pediatrician timezone (Lisbon summer)', async () => {
    const { service, prisma } = build({ timezone: 'Europe/Lisbon' });
    await service.myBookings('u1', '2999-07-10', '2999-07-12');
    const where = (prisma.videoSession.findMany as jest.Mock).mock.calls[0][0].where;
    // Local midnight in Lisbon summer (UTC+1) is 23:00Z of the previous day;
    // the range is [local-midnight(from), local-midnight(to)+1day).
    expect(where.scheduledAt.gte.toISOString()).toBe('2999-07-09T23:00:00.000Z');
    expect(where.scheduledAt.lt.toISOString()).toBe('2999-07-12T23:00:00.000Z');
  });

  it('filters to live consultations only (OPEN/TRIAGE/ANSWERED) of this pediatrician', async () => {
    const { service, prisma } = build();
    await service.myBookings('u1', '2999-07-10', '2999-07-10');
    const where = (prisma.videoSession.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.consultation.pediatricianId).toBe('ped1');
    expect(where.consultation.status.in.sort()).toEqual(['ANSWERED', 'OPEN', 'TRIAGE']);
  });

  it('caps the range at 62 days and validates dates', async () => {
    const { service } = build();
    // 62 days (2999-01-01 → 2999-03-03) is fine; 63 is not.
    await expect(service.myBookings('u1', '2999-01-01', '2999-03-03')).resolves.toEqual([]);
    await expect(service.myBookings('u1', '2999-01-01', '2999-03-04')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.myBookings('u1', '2999-07-12', '2999-07-10')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.myBookings('u1', 'not-a-date', '2999-07-10')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.myBookings('u1', '2999-02-31', '2999-03-01')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.myBookings('u1', undefined, undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('SchedulingService.markUnavailable (vacation / closed days)', () => {
  it('no impact → creates one closed row per day per kind (inert 0–0 window)', async () => {
    const { service, prisma } = build();
    const res = await service.markUnavailable('u1', { from: '2999-01-04', to: '2999-01-05' });
    expect(res).toMatchObject({ days: 2, created: 4, cancelled: 0 });
    const rows = (prisma.availability.createMany as jest.Mock).mock.calls[0][0].data;
    expect(rows).toHaveLength(4);
    const kinds = rows.map((r: any) => `${r.kind}:${r.date.toISOString().slice(0, 10)}`).sort();
    expect(kinds).toEqual([
      'MESSAGES:2999-01-04',
      'MESSAGES:2999-01-05',
      'VIDEO:2999-01-04',
      'VIDEO:2999-01-05',
    ]);
    for (const r of rows) {
      expect(r).toMatchObject({
        pediatricianId: 'ped1',
        closed: true,
        startMinute: 0,
        endMinute: 0,
        weekday: r.date.getUTCDay(),
      });
    }
  });

  it('is idempotent: days that already have a closed row of a kind are skipped', async () => {
    const { service, prisma } = build({
      existingClosed: [
        { kind: 'VIDEO', date: new Date('2999-01-04T00:00:00.000Z') },
        { kind: 'MESSAGES', date: new Date('2999-01-04T00:00:00.000Z') },
        { kind: 'VIDEO', date: new Date('2999-01-05T00:00:00.000Z') },
      ],
    });
    const res = await service.markUnavailable('u1', { from: '2999-01-04', to: '2999-01-05' });
    expect(res.created).toBe(1);
    const rows = (prisma.availability.createMany as jest.Mock).mock.calls[0][0].data;
    expect(rows).toEqual([
      expect.objectContaining({ kind: 'MESSAGES', date: new Date('2999-01-05T00:00:00.000Z') }),
    ]);
  });

  it('fully-closed already → createMany is not called at all', async () => {
    const { service, prisma } = build({
      existingClosed: [
        { kind: 'VIDEO', date: new Date('2999-01-04T00:00:00.000Z') },
        { kind: 'MESSAGES', date: new Date('2999-01-04T00:00:00.000Z') },
      ],
    });
    const res = await service.markUnavailable('u1', { from: '2999-01-04', to: '2999-01-04' });
    expect(res.created).toBe(0);
    expect(prisma.availability.createMany).not.toHaveBeenCalled();
  });

  it('409s with the affected list (initials only) when booked sessions fall inside and no confirm', async () => {
    const { service, prisma, payments } = build({
      sessions: [session('2999-01-04T10:30:00.000Z', 'c1', 'Tomás Mota')],
    });
    let caught: unknown;
    await service
      .markUnavailable('u1', { from: '2999-01-04', to: '2999-01-05' })
      .catch((e) => (caught = e));
    expect(caught).toBeInstanceOf(ConflictException);
    const payload = (caught as ConflictException).getResponse() as any;
    expect(payload.message).toBe('Esta alteração afeta consultas marcadas.');
    expect(payload.affected).toEqual([
      {
        consultationId: 'c1',
        scheduledAt: new Date('2999-01-04T10:30:00.000Z'),
        childInitials: 'T.M.',
      },
    ]);
    expect(payments.refundForConsultation).not.toHaveBeenCalled();
    expect(prisma.availability.createMany).not.toHaveBeenCalled();
  });

  it('the impact query spans the LOCAL day window and targets OPEN/TRIAGE only', async () => {
    const { service, prisma } = build({ timezone: 'Europe/Lisbon' });
    await service.markUnavailable('u1', { from: '2999-07-10', to: '2999-07-11' });
    const where = (prisma.videoSession.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.scheduledAt.gte.toISOString()).toBe('2999-07-09T23:00:00.000Z');
    expect(where.scheduledAt.lt.toISOString()).toBe('2999-07-11T23:00:00.000Z');
    expect(where.consultation.status.in.sort()).toEqual(['OPEN', 'TRIAGE']);
  });

  it('with confirm: refunds, marks REFUNDED, emits rebook, then creates the closed rows', async () => {
    const { service, prisma, payments, events } = build({
      sessions: [session('2999-01-04T10:30:00.000Z', 'c1')],
    });
    const res = await service.markUnavailable('u1', {
      from: '2999-01-04',
      to: '2999-01-04',
      confirm: true,
    });
    expect(payments.refundForConsultation).toHaveBeenCalledWith('c1', 'pediatrician_unavailable');
    expect(prisma.consultation.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { status: 'REFUNDED' },
    });
    expect(events.emit).toHaveBeenCalledWith(
      'consultation.rebook_offered',
      expect.objectContaining({ consultationId: 'c1' }),
    );
    expect(res).toMatchObject({ days: 1, created: 2, cancelled: 1 });
    expect(prisma.availability.createMany).toHaveBeenCalled();
  });

  it('rejects a start in the past, inverted ranges and ranges longer than 62 days', async () => {
    const { service } = build();
    await expect(
      service.markUnavailable('u1', { from: '2000-01-01', to: '2999-01-05' }),
    ).rejects.toBeInstanceOf(BadRequestException); // range > 62 days AND past — both 400
    await expect(
      service.markUnavailable('u1', { from: '2999-01-05', to: '2999-01-04' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.markUnavailable('u1', { from: '2999-01-01', to: '2999-03-04' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.markUnavailable('u1', { from: '2000-01-01', to: '2000-01-02' }),
    ).rejects.toBeInstanceOf(BadRequestException); // in the past (pediatrician-local)
  });
});

describe('SchedulingService.deleteAvailability — closed rows', () => {
  it('deleting a closed VIDEO row is free: no booking check, day reopens', async () => {
    const block = {
      id: 'b1',
      pediatricianId: 'ped1',
      kind: 'VIDEO',
      weekday: 1,
      startMinute: 0,
      endMinute: 0,
      slotMinutes: 20,
      date: new Date('2999-01-04T00:00:00.000Z'),
      closed: true,
    };
    // A booked session exists that day — irrelevant: a closed row defines no window.
    const { service, prisma, payments } = build({
      block,
      sessions: [session('2999-01-04T10:30:00.000Z')],
    });
    await service.deleteAvailability('u1', 'b1');
    expect(prisma.videoSession.findMany).not.toHaveBeenCalled();
    expect(payments.refundForConsultation).not.toHaveBeenCalled();
    expect(prisma.availability.delete).toHaveBeenCalledWith({ where: { id: 'b1' } });
  });

  it('affectedBookings on an inert (0–0) window returns [] without querying sessions', async () => {
    const { service, prisma } = build({ sessions: [session('2999-01-04T10:30:00.000Z')] });
    const affected = await service.affectedBookings('ped1', {
      kind: 'VIDEO' as any,
      weekday: 1,
      startMinute: 0,
      endMinute: 0,
      date: new Date('2999-01-04T00:00:00.000Z'),
    });
    expect(affected).toEqual([]);
    expect(prisma.videoSession.findMany).not.toHaveBeenCalled();
  });
});

describe('PediatriciansService — closed rows excluded from marketplace queries', () => {
  function pedService() {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma: any = { availability: { findMany } };
    return { service: new PediatriciansService(prisma, {} as any), findMany };
  }

  it('availableWeekdaysByPediatrician never counts closed rows', async () => {
    const { service, findMany } = pedService();
    await (service as any).availableWeekdaysByPediatrician(['p1']);
    expect(findMany.mock.calls[0][0].where).toMatchObject({ kind: 'VIDEO', closed: false });
  });

  it('messageWindowsByPediatrician never advertises closed rows', async () => {
    const { service, findMany } = pedService();
    await (service as any).messageWindowsByPediatrician(['p1']);
    expect(findMany.mock.calls[0][0].where).toMatchObject({
      kind: 'MESSAGES',
      date: null,
      closed: false,
    });
  });
});
