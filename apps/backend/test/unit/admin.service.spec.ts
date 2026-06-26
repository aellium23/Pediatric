import { PediatricianStatus, PaymentStatus, Role } from '@prisma/client';
import { AdminService } from '../../src/modules/admin/admin.module';

function build(over: { prisma?: Record<string, any> } = {}) {
  const prisma: any = {
    user: {
      groupBy: jest.fn().mockResolvedValue([
        { role: Role.PARENT, _count: { _all: 12 } },
        { role: Role.PEDIATRICIAN, _count: { _all: 3 } },
      ]),
      update: jest.fn().mockResolvedValue({ id: 'u1', role: Role.COMPLIANCE }),
    },
    pediatrician: {
      groupBy: jest.fn().mockResolvedValue([{ status: PediatricianStatus.ACTIVE, _count: { _all: 2 } }]),
      update: jest.fn().mockResolvedValue({ id: 'p1' }),
    },
    consultation: {
      groupBy: jest.fn().mockResolvedValue([{ status: 'CLOSED', _count: { _all: 5 } }]),
    },
    split: {
      findMany: jest.fn().mockResolvedValue([
        { platformFeeCents: 900, pediatricianAmount: 3600 },
        { platformFeeCents: 200, pediatricianAmount: 800 },
      ]),
    },
    payment: { count: jest.fn().mockResolvedValue(1) },
    family: { count: jest.fn().mockResolvedValue(7) },
    child: { count: jest.fn().mockResolvedValue(9) },
    verificationDocument: { update: jest.fn().mockResolvedValue({ id: 'd1' }) },
    ...over.prisma,
  };
  return { service: new AdminService(prisma as any), prisma };
}

describe('AdminService', () => {
  describe('metrics', () => {
    it('aggregates gross and commission from the splits and shapes the KPIs', async () => {
      const { service, prisma } = build();
      const m = await service.metrics();

      // gross = (900+3600) + (200+800) = 5500; commission = 900+200 = 1100.
      expect(m.grossCents).toBe(5500);
      expect(m.commissionCents).toBe(1100);
      expect(m.usersByRole).toEqual({ [Role.PARENT]: 12, [Role.PEDIATRICIAN]: 3 });
      expect(m.pediatriciansByStatus).toEqual({ [PediatricianStatus.ACTIVE]: 2 });
      expect(m.consultationsByStatus).toEqual({ CLOSED: 5 });
      expect(m.refunds).toBe(1);
      expect(m.families).toBe(7);
      expect(m.children).toBe(9);
      expect(m.currency).toBe('EUR');

      // Refund count is filtered to REFUNDED payments only.
      expect(prisma.payment.count).toHaveBeenCalledWith({ where: { status: PaymentStatus.REFUNDED } });
    });

    it('reports zero revenue when there are no splits', async () => {
      const { service } = build({ prisma: { split: { findMany: jest.fn().mockResolvedValue([]) } } });
      const m = await service.metrics();
      expect(m.grossCents).toBe(0);
      expect(m.commissionCents).toBe(0);
    });
  });

  describe('verification queue', () => {
    it('verify sets the pediatrician ACTIVE and stamps licenseVerifiedAt', async () => {
      const { service, prisma } = build();
      await service.verifyPediatrician('p1');
      const data = prisma.pediatrician.update.mock.calls[0][0].data;
      expect(data.status).toBe(PediatricianStatus.ACTIVE);
      expect(data.licenseVerifiedAt).toBeInstanceOf(Date);
    });

    it('suspend sets the pediatrician SUSPENDED', async () => {
      const { service, prisma } = build();
      await service.suspendPediatrician('p1');
      expect(prisma.pediatrician.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'p1' }, data: { status: PediatricianStatus.SUSPENDED } }),
      );
    });
  });

  describe('document review', () => {
    it('records the decision, note, and review timestamp', async () => {
      const { service, prisma } = build();
      await service.reviewDocument('d1', 'rejected', 'cédula ilegível');
      const data = prisma.verificationDocument.update.mock.calls[0][0].data;
      expect(data.status).toBe('rejected');
      expect(data.note).toBe('cédula ilegível');
      expect(data.reviewedAt).toBeInstanceOf(Date);
    });
  });

  describe('changeRole', () => {
    it('updates the user role', async () => {
      const { service, prisma } = build();
      await service.changeRole('u1', Role.COMPLIANCE);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' }, data: { role: Role.COMPLIANCE } }),
      );
    });
  });
});
