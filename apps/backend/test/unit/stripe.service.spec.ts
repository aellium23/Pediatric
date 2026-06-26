import { ServiceUnavailableException } from '@nestjs/common';

// Mock the Stripe SDK: the constructor returns a stub client whose methods we
// can assert on. The mock is hoisted, so the resources object lives on the
// factory and is re-read per test via the captured reference.
const stripeStub = {
  accounts: { create: jest.fn().mockResolvedValue({ id: 'acct_1' }) },
  accountLinks: { create: jest.fn().mockResolvedValue({ url: 'https://onboard' }) },
  paymentIntents: {
    create: jest.fn().mockResolvedValue({ id: 'pi_1', client_secret: 'cs_1' }),
    capture: jest.fn().mockResolvedValue({}),
  },
  transfers: { create: jest.fn().mockResolvedValue({ id: 'tr_1' }) },
  refunds: { create: jest.fn().mockResolvedValue({ id: 're_1' }) },
  webhooks: { constructEvent: jest.fn().mockReturnValue({ type: 'evt' }) },
};
jest.mock('stripe', () => jest.fn().mockImplementation(() => stripeStub));

import { StripeService } from '../../src/modules/payments/stripe.service';

function cfg(values: Record<string, any>) {
  return { get: jest.fn((k: string) => values[k]) } as any;
}

describe('StripeService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('disabled (no secret key)', () => {
    const svc = () => new StripeService(cfg({ 'stripe.secretKey': '', 'stripe.platformFeeBps': 2000 }));

    it('reports disabled', () => {
      expect(svc().enabled).toBe(false);
    });

    it('throws a clear 503 for operations that need Stripe', async () => {
      await expect(svc().createConnectedAccount('a@b.pt')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      await expect(
        svc().createPaymentIntent({ amountCents: 4500, currency: 'EUR', consultationId: 'c1' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      await expect(svc().refund('pi_1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('enabled', () => {
    const svc = (bps = 2000) =>
      new StripeService(cfg({ 'stripe.secretKey': 'sk_test_x', 'stripe.platformFeeBps': bps }));

    it('reports enabled when a key is present', () => {
      expect(svc().enabled).toBe(true);
    });

    it('creates a manual-capture intent that holds funds', async () => {
      const res = await svc().createPaymentIntent({ amountCents: 4500, currency: 'EUR', consultationId: 'c1' });
      expect(res).toEqual({ id: 'pi_1', clientSecret: 'cs_1' });
      expect(stripeStub.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 4500, currency: 'eur', capture_method: 'manual' }),
      );
    });

    it('splits the platform fee (20%) and transfers the pediatrician share', async () => {
      const res = await svc(2000).captureAndSplit({
        paymentIntentId: 'pi_1',
        amountCents: 4500,
        connectedAccountId: 'acct_1',
      });
      // 20% of 4500 = 900; pediatrician keeps 3600.
      expect(res).toEqual({ platformFeeCents: 900, pediatricianAmount: 3600 });
      expect(stripeStub.paymentIntents.capture).toHaveBeenCalledWith('pi_1');
      expect(stripeStub.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 3600, destination: 'acct_1' }),
      );
    });

    it('rounds the fee to the nearest cent for awkward amounts', async () => {
      // 15% of 999 = 149.85 → rounds to 150; pediatrician keeps 849.
      const res = await svc(1500).captureAndSplit({
        paymentIntentId: 'pi_2',
        amountCents: 999,
        connectedAccountId: 'acct_1',
      });
      expect(res.platformFeeCents).toBe(150);
      expect(res.pediatricianAmount).toBe(849);
      expect(res.platformFeeCents + res.pediatricianAmount).toBe(999);
    });

    it('refunds the full amount by default', async () => {
      await svc().refund('pi_1');
      expect(stripeStub.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_1' });
    });

    it('refunds a partial amount when given one', async () => {
      await svc().refund('pi_1', 1000);
      expect(stripeStub.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_1', amount: 1000 });
    });
  });
});
