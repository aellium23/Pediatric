import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { HealthRecordsService } from '../../src/modules/health-records/health-records.module';
import { ChildAccessService } from '../../src/common/security/child-access.service';

function build(over: Record<string, any> = {}) {
  const prisma: any = {
    child: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', familyId: 'fam1' }) },
    familyMember: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
    vital: { create: jest.fn().mockResolvedValue({ id: 'v1' }), findMany: jest.fn().mockResolvedValue([]) },
    ...over,
  };
  const crypto = { encrypt: (s: string) => s, decrypt: (s: string) => s };
  const access = new ChildAccessService(prisma as any);
  return { service: new HealthRecordsService(prisma as any, crypto as any, access), prisma };
}

const parent = { userId: 'u1', role: Role.PARENT } as any;

describe('HealthRecordsService.addVital', () => {
  it('persists the numeric vital signs for an authorized parent', async () => {
    const { service, prisma } = build();
    await service.addVital(parent, 'c1', {
      measuredAt: '2026-06-26',
      temperatureC: 38.4,
      heartRateBpm: 120,
      spo2Pct: 97,
    } as any);
    const data = prisma.vital.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ childId: 'c1', temperatureC: 38.4, heartRateBpm: 120, spo2Pct: 97 });
    expect(data.measuredAt).toBeInstanceOf(Date);
  });

  it('rejects a parent who does not own the child', async () => {
    const { service } = build({ familyMember: { findFirst: jest.fn().mockResolvedValue(null) } });
    await expect(
      service.addVital(parent, 'c1', { measuredAt: '2026-06-26', temperatureC: 37 } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
