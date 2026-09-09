import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ConsultationsService } from '../../src/modules/consultations/consultations.service';

function make(prisma: Record<string, any>) {
  return new ConsultationsService(
    prisma as any,
    {} as any, // crypto
    {} as any, // consent
    {} as any, // payments
    {} as any, // subscriptions
    {} as any, // events
    {} as any, // ai
  );
}

describe('ConsultationsService — patient chart', () => {
  describe('patientsForPediatrician', () => {
    it('groups the caseload by family with per-child counts and last-seen', async () => {
      const prisma = {
        pediatrician: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'ped1' }) },
        consultation: {
          findMany: jest.fn().mockResolvedValue([
            { childId: 'c1', openedAt: new Date('2026-02-01') },
            { childId: 'c1', openedAt: new Date('2026-03-01') },
            { childId: 'c2', openedAt: new Date('2026-01-15') },
          ]),
        },
        child: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'c1', name: 'Ana', birthDate: new Date('2020-01-01'), sex: 'F', familyId: 'famA' },
            { id: 'c2', name: 'Beto', birthDate: new Date('2018-01-01'), sex: 'M', familyId: 'famA' },
          ]),
        },
        family: { findMany: jest.fn().mockResolvedValue([{ id: 'famA', name: 'Família Silva' }]) },
        familyMember: {
          findMany: jest.fn().mockResolvedValue([
            { familyId: 'famA', relationship: 'father', user: { name: 'Nuno Silva', email: null } },
            { familyId: 'famA', relationship: 'mother', user: { name: 'Marta Silva', email: null } },
          ]),
        },
      };
      const svc = make(prisma);
      const out = await svc.patientsForPediatrician('u1');

      expect(out).toHaveLength(1);
      expect(out[0].name).toBe('Família Silva');
      // Guardians ordered mother-first.
      expect(out[0].guardians.map((g) => g.name)).toEqual(['Marta Silva', 'Nuno Silva']);
      expect(out[0].children).toHaveLength(2);
      const ana = out[0].children.find((c) => c.id === 'c1')!;
      expect(ana.consultationCount).toBe(2);
      expect(ana.lastConsultAt).toEqual(new Date('2026-03-01'));
    });

    it('returns an empty caseload when the pediatrician has no consultations', async () => {
      const prisma = {
        pediatrician: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'ped1' }) },
        consultation: { findMany: jest.fn().mockResolvedValue([]) },
        child: { findMany: jest.fn() },
        family: { findMany: jest.fn() },
      };
      const out = await make(prisma).patientsForPediatrician('u1');
      expect(out).toEqual([]);
    });
  });

  describe('historyForChild', () => {
    const child = { id: 'c1', name: 'Ana', birthDate: new Date('2020-01-01'), sex: 'F', familyId: 'famA' };

    it('404s for an unknown child', async () => {
      const prisma = { child: { findUnique: jest.fn().mockResolvedValue(null) } };
      await expect(
        make(prisma).historyForChild({ userId: 'u', role: Role.PARENT } as any, 'nope'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('scopes a pediatrician to their OWN consultations with the child', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = {
        child: { findUnique: jest.fn().mockResolvedValue(child) },
        pediatrician: { findUnique: jest.fn().mockResolvedValue({ id: 'ped1' }) },
        consultation: { findFirst: jest.fn().mockResolvedValue({ id: 'x' }), findMany },
      };
      await make(prisma).historyForChild({ userId: 'pedU', role: Role.PEDIATRICIAN } as any, 'c1');
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { childId: 'c1', pediatricianId: 'ped1' } }),
      );
    });

    it('rejects a pediatrician with no consultation for the child (403)', async () => {
      const prisma = {
        child: { findUnique: jest.fn().mockResolvedValue(child) },
        pediatrician: { findUnique: jest.fn().mockResolvedValue({ id: 'ped1' }) },
        consultation: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      await expect(
        make(prisma).historyForChild({ userId: 'pedU', role: Role.PEDIATRICIAN } as any, 'c1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets a family member see all of the child consultations', async () => {
      const findMany = jest.fn().mockResolvedValue([{ id: 'h1' }]);
      const prisma = {
        child: { findUnique: jest.fn().mockResolvedValue(child) },
        familyMember: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
        consultation: { findMany },
      };
      const out = await make(prisma).historyForChild({ userId: 'parentU', role: Role.PARENT } as any, 'c1');
      expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { childId: 'c1' } }));
      expect(out.child.name).toBe('Ana');
      expect(out.consultations).toHaveLength(1);
    });

    it('rejects a parent outside the family (403)', async () => {
      const prisma = {
        child: { findUnique: jest.fn().mockResolvedValue(child) },
        familyMember: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      await expect(
        make(prisma).historyForChild({ userId: 'stranger', role: Role.PARENT } as any, 'c1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
