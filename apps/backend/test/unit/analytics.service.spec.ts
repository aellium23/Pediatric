import { Role } from '@prisma/client';
import { AnalyticsService } from '../../src/modules/analytics/analytics.module';

function build(rows: { name: string; userId?: string | null; createdAt: Date }[] = []) {
  const create = jest.fn().mockResolvedValue({});
  const prisma: any = {
    analyticsEvent: {
      create,
      findMany: jest.fn().mockResolvedValue(rows),
      count: jest.fn().mockResolvedValue(rows.length),
    },
  };
  return { service: new AnalyticsService(prisma), prisma, create };
}

const d = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe('AnalyticsService', () => {
  describe('track', () => {
    it('writes the event with only structured fields', async () => {
      const { service, create } = build();
      service.track({
        name: 'triage_start',
        role: Role.PARENT,
        userId: 'u1',
        consultationId: 'c1',
        pediatricianId: 'p1',
        value: 1800,
      });
      await Promise.resolve();
      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'triage_start', userId: 'u1', value: 1800 }),
      });
      // The written columns are a fixed whitelist — there is no free-text field
      // that could carry clinical content.
      const allowed = [
        'name',
        'role',
        'userId',
        'consultationId',
        'pediatricianId',
        'specialty',
        'value',
      ];
      for (const key of Object.keys(create.mock.calls[0][0].data)) {
        expect(allowed).toContain(key);
      }
    });

    // Instrumentation must never be able to fail the thing it measures.
    it('swallows a database failure instead of throwing', async () => {
      const { service, prisma } = build();
      prisma.analyticsEvent.create = jest.fn().mockRejectedValue(new Error('db down'));
      expect(() => service.track({ name: 'closed', consultationId: 'c1' })).not.toThrow();
      await new Promise((r) => setImmediate(r));
    });
  });

  describe('summary', () => {
    it('counts the funnel and leaves unknown names out of it', async () => {
      const { service } = build([
        { name: 'triage_start', userId: 'u1', createdAt: d('2026-09-01') },
        { name: 'triage_start', userId: 'u2', createdAt: d('2026-09-02') },
        { name: 'answered', createdAt: d('2026-09-02') },
        { name: 'not_a_funnel_event', createdAt: d('2026-09-02') },
      ]);
      const s = await service.summary();
      const byName = Object.fromEntries(s.funnel.map((f) => [f.name, f.count]));
      expect(byName.triage_start).toBe(2);
      expect(byName.answered).toBe(1);
      expect(byName.closed).toBe(0);
      expect(s.funnel.some((f) => f.name === 'not_a_funnel_event')).toBe(false);
      expect(s.totalEvents).toBe(4);
    });

    // 2026-09-01 is a Tuesday; its week starts Monday 2026-08-31.
    it('buckets weeks on the Monday, including a Sunday', async () => {
      const { service } = build([
        { name: 'app_open', userId: 'u1', createdAt: d('2026-09-01') },
        { name: 'app_open', userId: 'u2', createdAt: d('2026-09-06') }, // Sunday, same week
        { name: 'app_open', userId: 'u1', createdAt: d('2026-09-07') }, // Monday, next week
      ]);
      const s = await service.summary();
      expect(s.habit.map((h) => h.weekStart)).toEqual(['2026-08-31', '2026-09-07']);
      expect(s.habit[0].activeParents).toBe(2);
      expect(s.habit[0].sessions).toBe(2);
      expect(s.habit[1].activeParents).toBe(1);
    });

    it('counts non-consultation actions as the habit signal', async () => {
      const { service } = build([
        { name: 'record_view', userId: 'u1', createdAt: d('2026-09-01') },
        { name: 'growth_add', userId: 'u1', createdAt: d('2026-09-01') },
        { name: 'article_read', userId: 'u1', createdAt: d('2026-09-02') },
        // Consultation traffic is NOT habit — it is the "child is ill" path.
        { name: 'triage_start', userId: 'u1', createdAt: d('2026-09-02') },
      ]);
      const s = await service.summary();
      expect(s.habit[0].nonConsultActions).toBe(3);
    });

    it('counts a parent as returning only across distinct weeks', async () => {
      const { service } = build([
        { name: 'app_open', userId: 'once', createdAt: d('2026-09-01') },
        { name: 'app_open', userId: 'once', createdAt: d('2026-09-02') }, // same week
        { name: 'app_open', userId: 'back', createdAt: d('2026-09-01') },
        { name: 'app_open', userId: 'back', createdAt: d('2026-09-08') }, // next week
      ]);
      const s = await service.summary();
      expect(s.returningParents).toBe(1);
    });

    it('ignores anonymised events when counting people, but keeps the session', async () => {
      const { service } = build([
        { name: 'app_open', userId: null, createdAt: d('2026-09-01') },
        { name: 'app_open', userId: 'u1', createdAt: d('2026-09-01') },
      ]);
      const s = await service.summary();
      expect(s.habit[0].activeParents).toBe(1);
      expect(s.habit[0].sessions).toBe(2);
    });
  });

  describe('ingest', () => {
    it('stamps the caller identity onto every client event', async () => {
      const { service, create } = build();
      await service.ingest({ userId: 'u9', role: Role.PARENT } as any, {
        events: [{ name: 'search' }, { name: 'open_profile', pediatricianId: 'p2' }],
      } as any);
      await Promise.resolve();
      expect(create).toHaveBeenCalledTimes(2);
      expect(create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({ name: 'search', userId: 'u9', role: Role.PARENT }),
      );
      expect(create.mock.calls[1][0].data).toEqual(
        expect.objectContaining({ name: 'open_profile', pediatricianId: 'p2' }),
      );
    });
  });

  describe('csv', () => {
    it('exports the structured columns only', async () => {
      const { service, prisma } = build();
      prisma.analyticsEvent.findMany = jest.fn().mockResolvedValue([
        {
          createdAt: d('2026-09-01'),
          name: 'rated',
          role: Role.PARENT,
          userId: 'u1',
          consultationId: 'c1',
          pediatricianId: 'p1',
          specialty: null,
          value: 5,
        },
      ]);
      const csv = await service.csv();
      const [header, row] = csv.split('\n');
      expect(header).toBe(
        'createdAt,name,role,userId,consultationId,pediatricianId,specialty,value',
      );
      expect(row).toContain('rated');
      expect(row.endsWith(',5')).toBe(true);
    });
  });
});
