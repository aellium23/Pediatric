import { NotificationsService } from '../../src/modules/notifications/notifications.module';
import {
  MessageCreatedEvent,
  PaymentCapturedEvent,
  ConsultationExpiredEvent,
} from '../../src/modules/consultations/events';

function build(over: { prisma?: Record<string, any> } = {}) {
  const prisma: any = {
    consultation: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'c1', familyId: 'fam1', pediatrician: { userId: 'pedUser' } }),
    },
    familyMember: {
      findMany: jest.fn().mockResolvedValue([{ userId: 'parentA' }, { userId: 'parentB' }]),
    },
    family: { findUnique: jest.fn().mockResolvedValue({ primaryUserId: 'parentA' }) },
    notification: {
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    deviceToken: { upsert: jest.fn().mockResolvedValue({}) },
    ...over.prisma,
  };
  const push = { push: jest.fn().mockResolvedValue(undefined) };
  const service = new NotificationsService(prisma as any, push as any);
  return { service, prisma, push };
}

describe('NotificationsService', () => {
  describe('onMessage fan-out', () => {
    it('notifies the pediatrician and every family member except the sender, deduped', async () => {
      const { service, prisma, push } = build();
      // parentA sends → recipients should be pedUser + parentB (not parentA).
      await service.onMessage(new MessageCreatedEvent('c1', 'm1', 'parentA'));

      const notified = prisma.notification.create.mock.calls.map((c: any[]) => c[0].data.userId);
      expect(new Set(notified)).toEqual(new Set(['pedUser', 'parentB']));
      expect(notified).not.toContain('parentA');
      // Each persisted notification is also pushed.
      expect(push.push).toHaveBeenCalledTimes(notified.length);
    });

    it('does not duplicate when the same user appears twice (e.g. member is also pediatrician)', async () => {
      const { service, prisma } = build({
        prisma: {
          consultation: {
            findUnique: jest
              .fn()
              .mockResolvedValue({ id: 'c1', familyId: 'fam1', pediatrician: { userId: 'parentB' } }),
          },
          familyMember: { findMany: jest.fn().mockResolvedValue([{ userId: 'parentA' }, { userId: 'parentB' }]) },
          notification: { create: jest.fn().mockResolvedValue({}) },
        },
      });
      await service.onMessage(new MessageCreatedEvent('c1', 'm1', 'parentA'));
      const notified = prisma.notification.create.mock.calls.map((c: any[]) => c[0].data.userId);
      // parentB appears as both member and pediatrician → notified once.
      expect(notified.filter((u: string) => u === 'parentB')).toHaveLength(1);
    });

    it('is a silent no-op when the consultation is gone', async () => {
      const { service, push } = build({
        prisma: { consultation: { findUnique: jest.fn().mockResolvedValue(null) } },
      });
      await service.onMessage(new MessageCreatedEvent('gone', 'm1', 'x'));
      expect(push.push).not.toHaveBeenCalled();
    });
  });

  describe('lifecycle notifications', () => {
    it('notifies the family primary user when payment is captured (invoice)', async () => {
      const { service, prisma } = build();
      await service.onCaptured(new PaymentCapturedEvent('c1', 900, 3600));
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'parentA', type: 'invoice' }) }),
      );
    });

    it('notifies the primary user with a refund when the consultation expires', async () => {
      const { service, prisma } = build();
      await service.onExpired(new ConsultationExpiredEvent('c1'));
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'parentA', type: 'refund' }) }),
      );
    });

    it('skips when the family has no primary user', async () => {
      const { service, push } = build({
        prisma: { family: { findUnique: jest.fn().mockResolvedValue({ primaryUserId: null }) } },
      });
      await service.onCaptured(new PaymentCapturedEvent('c1', 900, 3600));
      expect(push.push).not.toHaveBeenCalled();
    });
  });

  describe('user-scoped actions', () => {
    it('markRead scopes the update to the calling user', async () => {
      const { service, prisma } = build();
      await service.markRead('u1', 'n1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'n1', userId: 'u1' }, data: { read: true } }),
      );
    });

    it('registerDevice upserts the token to the current user', async () => {
      const { service, prisma } = build();
      await service.registerDevice('u1', { platform: 'ios', token: 'tok' } as any);
      expect(prisma.deviceToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: 'tok' },
          create: expect.objectContaining({ userId: 'u1', platform: 'ios' }),
        }),
      );
    });
  });
});
