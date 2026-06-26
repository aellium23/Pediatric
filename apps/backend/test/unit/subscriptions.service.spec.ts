import { BadRequestException } from '@nestjs/common';
import { Role, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { SubscriptionsService } from '../../src/modules/subscriptions/subscriptions.module';
import { AuthenticatedUser } from '../../src/common/security/jwt.strategy';

function build() {
  const prisma: any = {
    subscription: {
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'sub1', status: SubscriptionStatus.ACTIVE, ...data }),
      ),
    },
  };
  return { service: new SubscriptionsService(prisma), prisma };
}

function userOf(role: Role): AuthenticatedUser {
  return { userId: 'u1', role };
}

describe('SubscriptionsService', () => {
  describe('plansFor', () => {
    it('returns only the FAMILY plan to a parent', () => {
      const { service } = build();
      const plans = service.plansFor(Role.PARENT);
      expect(plans).toHaveLength(1);
      expect(plans[0].plan).toBe('FAMILY');
      expect(plans[0].role).toBe(Role.PARENT);
    });

    it('returns only the PED_PRO plan to a pediatrician', () => {
      const { service } = build();
      const plans = service.plansFor(Role.PEDIATRICIAN);
      expect(plans).toHaveLength(1);
      expect(plans[0].plan).toBe('PED_PRO');
      expect(plans[0].role).toBe(Role.PEDIATRICIAN);
    });

    it('returns no plans to a role with no catalog entry', () => {
      const { service } = build();
      expect(service.plansFor(Role.FINANCE)).toHaveLength(0);
    });
  });

  describe('subscribe', () => {
    it('creates an active subscription for a matching profile', async () => {
      const { service, prisma } = build();
      const sub = await service.subscribe(userOf(Role.PARENT), SubscriptionPlan.FAMILY);
      // Any prior active subscription is cancelled first (single active per user).
      expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', status: SubscriptionStatus.ACTIVE },
        }),
      );
      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'u1', plan: SubscriptionPlan.FAMILY }),
        }),
      );
      expect(sub.id).toBe('sub1');
    });

    it('rejects a plan that does not match the profile role', async () => {
      const { service, prisma } = build();
      await expect(
        service.subscribe(userOf(Role.PARENT), SubscriptionPlan.PED_PRO),
      ).rejects.toBeInstanceOf(BadRequestException);
      // Rejected before touching the database.
      expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
      expect(prisma.subscription.create).not.toHaveBeenCalled();
    });
  });
});
