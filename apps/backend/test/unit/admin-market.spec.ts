import { PediatricianStatus } from '@prisma/client';
import { AdminService } from '../../src/modules/admin/admin.module';

const NOW = new Date();
const HOUR = 3_600_000;

function build(over: { prisma?: Record<string, any> } = {}) {
  const prisma: any = {
    family: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'fam1', region: 'Lisboa', createdAt: NOW },
        // Free text — must normalize into the Madeira bucket.
        { id: 'fam2', region: 'Funchal (Madeira)', createdAt: NOW },
        // No region → 'Sem região'; created long before the window.
        { id: 'fam3', region: null, createdAt: new Date('2020-01-01') },
      ]),
    },
    child: {
      groupBy: jest.fn().mockResolvedValue([
        { familyId: 'fam1', _count: { _all: 2 } },
        { familyId: 'fam2', _count: { _all: 1 } },
        { familyId: 'fam3', _count: { _all: 1 } },
      ]),
    },
    consultation: {
      findMany: jest.fn().mockResolvedValue([
        {
          familyId: 'fam1',
          pediatricianId: 'ped1',
          type: 'VIDEO',
          openedAt: NOW,
          scheduledAt: new Date(NOW.getTime() + 48 * HOUR),
        },
        { familyId: 'fam1', pediatricianId: 'ped1', type: 'MESSAGE', openedAt: NOW, scheduledAt: null },
        {
          familyId: 'fam3',
          pediatricianId: 'ped2',
          type: 'VIDEO',
          openedAt: NOW,
          scheduledAt: new Date(NOW.getTime() + 24 * HOUR),
        },
      ]),
    },
    pediatrician: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'ped1', region: 'Lisboa', specialties: ['pulmonology', 'general'] },
        { id: 'ped2', region: null, specialties: [] },
        { id: 'ped3', region: 'Ponta Delgada (Açores)', specialties: ['general'] },
      ]),
    },
    availability: {
      findMany: jest.fn().mockResolvedValue([
        // ped1: two 8h weekly template windows → 16h in Lisboa.
        { pediatricianId: 'ped1', startMinute: 480, endMinute: 960 },
        { pediatricianId: 'ped1', startMinute: 480, endMinute: 960 },
        // ped2 (no region) → 8h in 'Sem região'.
        { pediatricianId: 'ped2', startMinute: 0, endMinute: 480 },
        // ped3 → 8h in Açores.
        { pediatricianId: 'ped3', startMinute: 960, endMinute: 1440 },
      ]),
    },
    ...over.prisma,
  };
  return { service: new AdminService(prisma as any), prisma };
}

describe('AdminService.market', () => {
  it('buckets demand and supply by normalized region, including "Sem região"', async () => {
    const { service } = build();
    const m = await service.market(3);
    const byRegion = Object.fromEntries(m.regions.map((r: any) => [r.region, r]));

    expect(byRegion['Lisboa']).toEqual({
      region: 'Lisboa',
      families: 1,
      children: 2,
      consultations: 2,
      activePediatricians: 1,
      offeredHoursWeek: 16,
    });
    // Free-text family region normalized to the canonical island bucket.
    expect(byRegion['Madeira']).toEqual({
      region: 'Madeira',
      families: 1,
      children: 1,
      consultations: 0,
      activePediatricians: 0,
      offeredHoursWeek: 0,
    });
    // Null family region and null pediatrician region share the fallback bucket.
    expect(byRegion['Sem região']).toEqual({
      region: 'Sem região',
      families: 1,
      children: 1,
      consultations: 1,
      activePediatricians: 1,
      offeredHoursWeek: 8,
    });
    // Supply-only region (pediatrician, no families).
    expect(byRegion['Açores']).toEqual({
      region: 'Açores',
      families: 0,
      children: 0,
      consultations: 0,
      activePediatricians: 1,
      offeredHoursWeek: 8,
    });
  });

  it('attributes consultations to the pediatrician FIRST specialty and averages video lead', async () => {
    const { service } = build();
    const m = await service.market(3);
    const bySpec = Object.fromEntries(m.specialties.map((s: any) => [s.specialty, s]));

    // ped1's consultations go to 'pulmonology' (first listed), never 'general'.
    expect(bySpec['pulmonology']).toEqual({
      specialty: 'pulmonology',
      consultations: 2,
      activePediatricians: 1,
      avgVideoLeadHours: 48,
    });
    // 'general': ped1 (second specialty) + ped2 (empty list default) + ped3.
    expect(bySpec['general']).toEqual({
      specialty: 'general',
      consultations: 1,
      activePediatricians: 3,
      avgVideoLeadHours: 24,
    });
  });

  it('produces continuous monthly buckets keyed by openedAt / createdAt', async () => {
    const { service } = build();
    const m = await service.market(3);

    expect(m.monthly).toHaveLength(3);
    const key = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}`;
    const last = m.monthly[m.monthly.length - 1];
    expect(last).toEqual({
      month: key,
      consultations: 3,
      newFamilies: 2, // fam3 (2020) is outside the window
      byServiceType: { VIDEO: 2, MESSAGE: 1 },
    });
    // Months without movement still appear, zeroed.
    expect(m.monthly[0].consultations).toBe(0);
    expect(m.monthly[0].newFamilies).toBe(0);
    expect(m.monthly[0].byServiceType).toEqual({});
  });

  it('defaults to 6 months and caps at 24', async () => {
    const { service } = build();
    await expect(service.market()).resolves.toMatchObject({
      monthly: expect.arrayContaining([]),
    });
    expect((await service.market()).monthly).toHaveLength(6);
    expect((await service.market(100)).monthly).toHaveLength(24);
    expect((await service.market(-3)).monthly).toHaveLength(1);
  });

  it('queries only ACTIVE pediatricians and only weekly (non-dated, non-closed) templates', async () => {
    const { service, prisma } = build();
    await service.market(3);
    expect(prisma.pediatrician.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: PediatricianStatus.ACTIVE } }),
    );
    expect(prisma.availability.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ date: null, closed: false }),
      }),
    );
  });
});
