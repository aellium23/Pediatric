import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ChildrenService } from '../../src/modules/children/children.service';

function build(over: { prisma?: Record<string, any> } = {}) {
  const prisma: any = {
    familyMember: {
      findFirst: jest.fn().mockResolvedValue({ id: 'm1', familyId: 'fam1', userId: 'u1' }),
    },
    family: {
      update: jest.fn().mockResolvedValue({}),
    },
    ...over.prisma,
  };
  const crypto: any = {
    encrypt: jest.fn((v: string | null) => (v == null ? null : `enc(${v})`)),
    decryptSafe: jest.fn((v: string | null) => (v ? v.replace(/^enc\((.*)\)$/, '$1') : null)),
  };
  return { service: new ChildrenService(prisma as any, crypto as any), prisma };
}

describe('ChildrenService.setFamilyRegion', () => {
  it('normalizes free text and stores the canonical region + postal prefix', async () => {
    const { service, prisma } = build();
    const res = await service.setFamilyRegion('u1', 'lisboa', '1000');
    expect(res).toEqual({ ok: true, region: 'Lisboa', postalCode: '1000' });
    expect(prisma.family.update).toHaveBeenCalledWith({
      where: { id: 'fam1' },
      data: { region: 'Lisboa', postalCode: '1000' },
    });
  });

  it('accepts common free text ("Funchal (Madeira)" → Madeira)', async () => {
    const { service, prisma } = build();
    await service.setFamilyRegion('u1', 'Funchal (Madeira)');
    expect(prisma.family.update).toHaveBeenCalledWith({
      where: { id: 'fam1' },
      data: { region: 'Madeira' },
    });
  });

  it('leaves postalCode untouched when not provided', async () => {
    const { service, prisma } = build();
    await service.setFamilyRegion('u1', 'Porto');
    expect(prisma.family.update.mock.calls[0][0].data).toEqual({ region: 'Porto' });
  });

  it('rejects a region that does not normalize to PT_REGIONS', async () => {
    const { service, prisma } = build();
    await expect(service.setFamilyRegion('u1', 'Narnia')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.family.update).not.toHaveBeenCalled();
  });

  it('membership guard: a user without a family membership cannot set a region', async () => {
    const { service, prisma } = build({
      prisma: { familyMember: { findFirst: jest.fn().mockResolvedValue(null) } },
    });
    await expect(service.setFamilyRegion('intruder', 'Lisboa')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.family.update).not.toHaveBeenCalled();
  });
});

describe('ChildrenService.getFamilyForUser', () => {
  it('returns the family with its region fields', async () => {
    const { service } = build({
      prisma: {
        familyMember: {
          findFirst: jest.fn().mockResolvedValue({
            familyId: 'fam1',
            family: {
              id: 'fam1',
              name: 'Família Silva',
              region: 'Lisboa',
              postalCode: '1000',
              primaryUserId: 'u1',
            },
          }),
        },
      },
    });
    await expect(service.getFamilyForUser('u1')).resolves.toEqual({
      id: 'fam1',
      name: 'Família Silva',
      region: 'Lisboa',
      postalCode: '1000',
    });
  });

  it('returns null for a user without a family yet', async () => {
    const { service } = build({
      prisma: { familyMember: { findFirst: jest.fn().mockResolvedValue(null) } },
    });
    await expect(service.getFamilyForUser('u1')).resolves.toBeNull();
  });
});
