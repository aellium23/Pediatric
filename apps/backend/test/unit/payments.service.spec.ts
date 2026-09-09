import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PaymentsService } from '../../src/modules/payments/payments.service';

function build(over: { prisma?: Record<string, any>; stripe?: Record<string, any> } = {}) {
  const prisma: any = {
    consultation: {
      findUnique: jest.fn().mockResolvedValue({ id: 'c1', familyId: 'fam1', priceCents: 4500, currency: 'EUR' }),
    },
    familyMember: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ id: 'p1' }),
      update: jest.fn().mockReturnValue({ op: 'payment.update' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    split: { upsert: jest.fn().mockReturnValue({ op: 'split.upsert' }) },
    refund: { create: jest.fn().mockReturnValue({ op: 'refund.create' }) },
    $transaction: jest.fn().mockResolvedValue([]),
    ...over.prisma,
  };
  const stripe: any = {
    enabled: true,
    createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_1', clientSecret: 'cs_1' }),
    captureAndSplit: jest.fn().mockResolvedValue({ platformFeeCents: 900, pediatricianAmount: 3600 }),
    computeSplit: jest.fn((amountCents: number) => {
      const platformFeeCents = Math.round(amountCents * 0.2);
      return { platformFeeCents, pediatricianAmount: amountCents - platformFeeCents };
    }),
    refund: jest.fn().mockResolvedValue(undefined),
    ...over.stripe,
  };
  return { service: new PaymentsService(prisma, stripe), prisma, stripe };
}

describe('PaymentsService', () => {
  describe('createIntentForConsultation', () => {
    it('rejects a caller not in the consultation family', async () => {
      const { service } = build({ prisma: { familyMember: { findFirst: jest.fn().mockResolvedValue(null) } } });
      await expect(service.createIntentForConsultation('u1', 'c1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('records a placeholder payment and returns null clientSecret in demo mode', async () => {
      const { service, prisma, stripe } = build({ stripe: { enabled: false } });
      const res = await service.createIntentForConsultation('u1', 'c1');
      expect(res.clientSecret).toBeNull();
      expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
      expect(prisma.payment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ psp: 'demo' }) }),
      );
    });

    it('creates a real intent and stores its id when Stripe is enabled', async () => {
      const { service, prisma, stripe } = build();
      const res = await service.createIntentForConsultation('u1', 'c1');
      expect(res.clientSecret).toBe('cs_1');
      expect(stripe.createPaymentIntent).toHaveBeenCalled();
      expect(prisma.payment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ psp: 'stripe', pspRef: 'pi_1' }) }),
      );
    });
  });

  describe('captureAndSplit', () => {
    it('settles as zero when there is no payment (demo close)', async () => {
      const { service, stripe } = build({ prisma: { payment: { findUnique: jest.fn().mockResolvedValue(null) } } });
      const res = await service.captureAndSplit('c1');
      expect(res).toEqual({ platformFeeCents: 0, pediatricianAmount: 0 });
      expect(stripe.captureAndSplit).not.toHaveBeenCalled();
    });

    it('is idempotent when already captured with a split', async () => {
      const { service, stripe } = build({
        prisma: {
          payment: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'p1',
              pspRef: 'pi_1',
              status: PaymentStatus.CAPTURED,
              amountCents: 4500,
              split: { platformFeeCents: 900, pediatricianAmount: 3600 },
              consultation: { pediatrician: { stripeAccountId: 'acct_1' } },
            }),
          },
        },
      });
      const res = await service.captureAndSplit('c1');
      expect(res).toEqual({ platformFeeCents: 900, pediatricianAmount: 3600 });
      expect(stripe.captureAndSplit).not.toHaveBeenCalled();
    });

    it('settles a demo payment locally (never calls Stripe with a demo_ ref)', async () => {
      const { service, prisma, stripe } = build({
        prisma: {
          payment: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'p1',
              psp: 'demo',
              pspRef: 'demo_c1',
              status: PaymentStatus.CREATED,
              amountCents: 4500,
              split: null,
              consultation: { pediatrician: { stripeAccountId: null } },
            }),
            update: jest.fn().mockReturnValue({ op: 'payment.update' }),
          },
          split: { upsert: jest.fn().mockReturnValue({ op: 'split.upsert' }) },
          $transaction: jest.fn().mockResolvedValue([]),
        },
      });
      const res = await service.captureAndSplit('c1');
      expect(stripe.captureAndSplit).not.toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(res).toEqual({ platformFeeCents: 900, pediatricianAmount: 3600 });
    });

    it('rejects when the pediatrician has no payout account', async () => {
      const { service } = build({
        prisma: {
          payment: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'p1',
              pspRef: 'pi_1',
              status: PaymentStatus.CREATED,
              amountCents: 4500,
              split: null,
              consultation: { pediatrician: { stripeAccountId: null } },
            }),
          },
        },
      });
      await expect(service.captureAndSplit('c1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('captures, transfers the share, and persists status + split', async () => {
      const { service, prisma, stripe } = build({
        prisma: {
          payment: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'p1',
              pspRef: 'pi_1',
              status: PaymentStatus.CREATED,
              amountCents: 4500,
              split: null,
              consultation: { pediatrician: { stripeAccountId: 'acct_1' } },
            }),
            update: jest.fn().mockReturnValue({ op: 'payment.update' }),
          },
          split: { upsert: jest.fn().mockReturnValue({ op: 'split.upsert' }) },
          $transaction: jest.fn().mockResolvedValue([]),
        },
      });
      const res = await service.captureAndSplit('c1');
      expect(stripe.captureAndSplit).toHaveBeenCalledWith({
        paymentIntentId: 'pi_1',
        amountCents: 4500,
        connectedAccountId: 'acct_1',
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(res).toEqual({ platformFeeCents: 900, pediatricianAmount: 3600 });
    });
  });

  describe('refundForConsultation', () => {
    it('is a no-op when there is no pspRef', async () => {
      const { service, stripe } = build({ prisma: { payment: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', pspRef: null }) } } });
      await service.refundForConsultation('c1', 'cancelled');
      expect(stripe.refund).not.toHaveBeenCalled();
    });

    it('is a no-op when already refunded', async () => {
      const { service, stripe } = build({
        prisma: { payment: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', pspRef: 'pi_1', status: PaymentStatus.REFUNDED }) } },
      });
      await service.refundForConsultation('c1', 'cancelled');
      expect(stripe.refund).not.toHaveBeenCalled();
    });

    it('refunds a demo payment locally without calling Stripe', async () => {
      const { service, prisma, stripe } = build({
        prisma: {
          payment: {
            findUnique: jest
              .fn()
              .mockResolvedValue({ id: 'p1', psp: 'demo', pspRef: 'demo_c1', status: PaymentStatus.CREATED, amountCents: 4500 }),
            update: jest.fn().mockReturnValue({ op: 'payment.update' }),
          },
          refund: { create: jest.fn().mockReturnValue({ op: 'refund.create' }) },
          $transaction: jest.fn().mockResolvedValue([]),
        },
      });
      await service.refundForConsultation('c1', 'sla_breached');
      expect(stripe.refund).not.toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('refunds and records the refund row', async () => {
      const { service, prisma, stripe } = build({
        prisma: {
          payment: {
            findUnique: jest.fn().mockResolvedValue({ id: 'p1', pspRef: 'pi_1', status: PaymentStatus.CREATED, amountCents: 4500 }),
            update: jest.fn().mockReturnValue({ op: 'payment.update' }),
          },
          refund: { create: jest.fn().mockReturnValue({ op: 'refund.create' }) },
          $transaction: jest.fn().mockResolvedValue([]),
        },
      });
      await service.refundForConsultation('c1', 'sla_breached');
      expect(stripe.refund).toHaveBeenCalledWith('pi_1');
      expect(prisma.refund.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ reason: 'sla_breached', status: 'done' }) }),
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    /**
     * A family can only get back what it actually paid. On a consultation the
     * plan covered — fully or in part — the subsidised share never touched a
     * card, so refunding the full act value would hand them money they never
     * spent.
     */
    it('refunds only the family’s share of a partly covered consultation', async () => {
      const { service, prisma, stripe } = build({
        prisma: {
          payment: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'p1',
              pspRef: 'pi_1',
              status: PaymentStatus.CREATED,
              amountCents: 3000,
              subsidyCents: 2000,
            }),
            update: jest.fn().mockReturnValue({ op: 'payment.update' }),
          },
          refund: { create: jest.fn().mockReturnValue({ op: 'refund.create' }) },
          $transaction: jest.fn().mockResolvedValue([]),
        },
      });
      await service.refundForConsultation('c1', 'sla_breached');
      expect(stripe.refund).toHaveBeenCalledWith('pi_1');
      expect(prisma.refund.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amountCents: 1000 }) }),
      );
    });

    it('refunds nothing, and calls no PSP, when the plan paid the whole act', async () => {
      const { service, prisma, stripe } = build({
        prisma: {
          payment: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'p1',
              pspRef: 'sub_c1',
              psp: 'subscription',
              status: PaymentStatus.CREATED,
              amountCents: 1800,
              subsidyCents: 1800,
            }),
            update: jest.fn().mockReturnValue({ op: 'payment.update' }),
          },
          refund: { create: jest.fn().mockReturnValue({ op: 'refund.create' }) },
          $transaction: jest.fn().mockResolvedValue([]),
        },
      });
      await service.refundForConsultation('c1', 'sla_breached');
      expect(stripe.refund).not.toHaveBeenCalled();
      expect(prisma.refund.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amountCents: 0 }) }),
      );
    });
  });

  describe('handleWebhook', () => {
    it('marks the payment CAPTURED on payment_intent.succeeded', async () => {
      const { service, prisma } = build();
      await service.handleWebhook({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_1' } },
      } as any);
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { pspRef: 'pi_1' }, data: expect.objectContaining({ status: PaymentStatus.CAPTURED }) }),
      );
    });

    it('backfills the split when a webhook capture arrives without one', async () => {
      const { service, prisma } = build({
        prisma: {
          payment: {
            findUnique: jest.fn(),
            findFirst: jest
              .fn()
              .mockResolvedValue({ id: 'p1', pspRef: 'pi_1', amountCents: 4500, split: null }),
            upsert: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          split: { upsert: jest.fn().mockResolvedValue({ id: 'sp1' }) },
        },
      });
      await service.handleWebhook({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_1' } },
      } as any);
      expect(prisma.split.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ platformFeeCents: 900, pediatricianAmount: 3600 }),
        }),
      );
    });

    it('marks the payment REFUNDED on charge.refunded (by payment_intent)', async () => {
      const { service, prisma } = build();
      await service.handleWebhook({
        type: 'charge.refunded',
        data: { object: { payment_intent: 'pi_1' } },
      } as any);
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { pspRef: 'pi_1' }, data: { status: PaymentStatus.REFUNDED } }),
      );
    });
  });
});
