import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ClinicsService } from '../../src/modules/clinics/clinics.module';
import { AuthenticatedUser } from '../../src/common/security/jwt.strategy';

function build(over: Record<string, any> = {}) {
  const prisma: any = {
    clinicMember: {
      findFirst: jest.fn().mockResolvedValue({ id: 'm1', role: Role.CLINIC_ADMIN }),
      create: jest.fn().mockResolvedValue({ id: 'm1' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      upsert: jest.fn().mockResolvedValue({ id: 'm2' }),
    },
    clinic: { create: jest.fn().mockResolvedValue({ id: 'cl1', name: 'X' }) },
    pediatrician: { findUnique: jest.fn().mockResolvedValue({ id: 'ped1' }) },
    clinicPediatrician: {
      upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve({ id: 'cp1', ...create })),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'u-new' }),
    },
    ...over,
  };
  return { service: new ClinicsService(prisma), prisma };
}

const admin: AuthenticatedUser = { userId: 'u-admin', role: Role.CLINIC_ADMIN };
const staff: AuthenticatedUser = { userId: 'u-staff', role: Role.CLINIC_STAFF };
const platform: AuthenticatedUser = { userId: 'u-plat', role: Role.PLATFORM_ADMIN };

describe('ClinicsService — authorization', () => {
  it('lets a clinic admin add staff', async () => {
    const { service, prisma } = build();
    await service.addStaff(admin, 'cl1', { email: 'new@clinic.pt', role: Role.CLINIC_STAFF });
    expect(prisma.clinicMember.upsert).toHaveBeenCalled();
  });

  it('blocks a non-admin member from managing the clinic', async () => {
    // Not a CLINIC_ADMIN row -> findFirst returns null.
    const { service } = build({ clinicMember: { findFirst: jest.fn().mockResolvedValue(null) } });
    await expect(
      service.addStaff(staff, 'cl1', { email: 'x@y.pt', role: Role.CLINIC_STAFF }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a platform admin to manage any clinic without a membership row', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const { service, prisma } = build({
      clinicMember: { findFirst, deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    });
    await service.removeStaff(platform, 'cl1', 'someone');
    // Platform admin short-circuits the membership check entirely.
    expect(findFirst).not.toHaveBeenCalled();
    expect(prisma.clinicMember.deleteMany).toHaveBeenCalledWith({
      where: { clinicId: 'cl1', userId: 'someone' },
    });
  });

  it('rejects linking a pediatrician that does not exist', async () => {
    const { service } = build({ pediatrician: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(
      service.addPediatrician(admin, 'cl1', { pediatricianId: 'nope' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('defaults the revenue share to 20% when unspecified', async () => {
    const { service, prisma } = build();
    await service.addPediatrician(admin, 'cl1', { pediatricianId: 'ped1' });
    expect(prisma.clinicPediatrician.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ revenueSharePct: 20 }),
        update: expect.objectContaining({ revenueSharePct: 20 }),
      }),
    );
  });

  it('registers the creating clinic admin as the first member', async () => {
    const { service, prisma } = build();
    await service.create(admin, { name: 'Clínica Norte' });
    expect(prisma.clinicMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u-admin', role: Role.CLINIC_ADMIN }),
      }),
    );
  });
});
