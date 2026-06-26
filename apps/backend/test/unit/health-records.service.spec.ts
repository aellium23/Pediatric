import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { HealthRecordsService } from '../../src/modules/health-records/health-records.module';
import { AuthenticatedUser } from '../../src/common/security/jwt.strategy';

/** identity crypto: decrypt/encrypt are pass-through so assertions read plainly. */
const crypto: any = {
  encrypt: (s: string | null | undefined) => s ?? null,
  decrypt: (s: string | null | undefined) => s ?? null,
};

function build(prismaOverrides: Record<string, any> = {}) {
  const prisma: any = {
    child: { findUnique: jest.fn().mockResolvedValue({ id: 'ch1', familyId: 'fam1' }) },
    familyMember: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
    pediatrician: { findUnique: jest.fn().mockResolvedValue({ id: 'ped1' }) },
    consultation: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
    growthMeasurement: { findMany: jest.fn().mockResolvedValue([]) },
    vaccination: { findMany: jest.fn().mockResolvedValue([]) },
    medication: { findMany: jest.fn().mockResolvedValue([]) },
    episode: { findMany: jest.fn().mockResolvedValue([]) },
    vital: { findMany: jest.fn().mockResolvedValue([]) },
    ...prismaOverrides,
  };
  return { service: new HealthRecordsService(prisma, crypto), prisma };
}

const parent: AuthenticatedUser = { userId: 'u-parent', role: Role.PARENT };
const ped: AuthenticatedUser = { userId: 'u-ped', role: Role.PEDIATRICIAN };

describe('HealthRecordsService', () => {
  describe('access control', () => {
    it('rejects a parent who is not a member of the child family', async () => {
      const { service } = build({ familyMember: { findFirst: jest.fn().mockResolvedValue(null) } });
      await expect(service.overview(parent, 'ch1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a pediatrician with no consultation linked to the child', async () => {
      const { service } = build({ consultation: { findFirst: jest.fn().mockResolvedValue(null) } });
      await expect(service.overview(ped, 'ch1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a role with no access path (e.g. finance)', async () => {
      const { service } = build();
      const finance: AuthenticatedUser = { userId: 'u-fin', role: Role.FINANCE };
      await expect(service.overview(finance, 'ch1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when the child does not exist', async () => {
      const { service } = build({ child: { findUnique: jest.fn().mockResolvedValue(null) } });
      await expect(service.overview(parent, 'ch1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('overview BMI', () => {
    it('computes BMI rounded to one decimal when height and weight are present', async () => {
      const { service } = build({
        growthMeasurement: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'g1', measuredAt: new Date('2026-01-01'), heightCm: 100, weightKg: 16, headCm: null },
          ]),
        },
      });
      const res = await service.overview(parent, 'ch1');
      // 16 / (1.0 m)^2 = 16.0
      expect(res.growth[0].bmi).toBe(16);
    });

    it('rounds BMI to a single decimal place', async () => {
      const { service } = build({
        growthMeasurement: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'g2', measuredAt: new Date('2026-01-01'), heightCm: 120, weightKg: 25, headCm: null },
          ]),
        },
      });
      const res = await service.overview(parent, 'ch1');
      // 25 / 1.44 = 17.361... -> 17.4
      expect(res.growth[0].bmi).toBe(17.4);
    });

    it('returns null BMI when weight is missing', async () => {
      const { service } = build({
        growthMeasurement: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'g3', measuredAt: new Date('2026-01-01'), heightCm: 100, weightKg: null, headCm: null },
          ]),
        },
      });
      const res = await service.overview(parent, 'ch1');
      expect(res.growth[0].bmi).toBeNull();
    });
  });
});
