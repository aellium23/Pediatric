import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * Stripe Connect integration (separate charges & transfers / escrow-like).
 * Funds are held on the platform and transferred to the pediatrician's
 * connected account on consultation close, retaining the platform fee.
 *
 * Lazily constructed: with no STRIPE_SECRET_KEY the service stays DISABLED
 * (so the app boots and runs in demo mode); the real client is only built
 * when a key is present. Methods that need Stripe throw a clear 503 when
 * called while disabled instead of failing cryptically.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger('Stripe');
  private readonly stripe: Stripe | null;
  private readonly platformFeeBps: number;
  readonly webhookSecret: string;

  constructor(config: ConfigService) {
    const key = config.get<string>('stripe.secretKey') ?? '';
    this.stripe = key ? new Stripe(key, { apiVersion: '2024-06-20' }) : null;
    if (!this.stripe) {
      this.logger.warn('STRIPE_SECRET_KEY not set — payments run in demo mode (no real charges).');
    }
    this.platformFeeBps = config.get<number>('stripe.platformFeeBps') ?? 2000;
    this.webhookSecret = config.get('stripe.webhookSecret') ?? '';
  }

  /** Whether real Stripe is configured. */
  get enabled(): boolean {
    return this.stripe !== null;
  }

  private client(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Payments not configured (set STRIPE_SECRET_KEY)');
    }
    return this.stripe;
  }

  /** Onboard a pediatrician as a connected account (Express). */
  async createConnectedAccount(email: string): Promise<string> {
    const account = await this.client().accounts.create({
      type: 'express',
      country: 'PT',
      email,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
    });
    return account.id;
  }

  async createAccountOnboardingLink(accountId: string, returnUrl: string): Promise<string> {
    const link = await this.client().accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: returnUrl,
      return_url: returnUrl,
    });
    return link.url;
  }

  /** Create a PaymentIntent that holds funds on the platform (manual capture). */
  async createPaymentIntent(params: {
    amountCents: number;
    currency: string;
    consultationId: string;
  }): Promise<{ id: string; clientSecret: string }> {
    const intent = await this.client().paymentIntents.create({
      amount: params.amountCents,
      currency: params.currency.toLowerCase(),
      capture_method: 'manual',
      automatic_payment_methods: { enabled: true },
      metadata: { consultationId: params.consultationId },
    });
    return { id: intent.id, clientSecret: intent.client_secret! };
  }

  /** On close: capture and transfer the pediatrician's share, keeping the fee. */
  async captureAndSplit(params: {
    paymentIntentId: string;
    amountCents: number;
    connectedAccountId: string;
  }): Promise<{ platformFeeCents: number; pediatricianAmount: number }> {
    await this.client().paymentIntents.capture(params.paymentIntentId);

    const platformFeeCents = Math.round((params.amountCents * this.platformFeeBps) / 10000);
    const pediatricianAmount = params.amountCents - platformFeeCents;

    await this.client().transfers.create({
      amount: pediatricianAmount,
      currency: 'eur',
      destination: params.connectedAccountId,
      transfer_group: params.paymentIntentId,
    });

    return { platformFeeCents, pediatricianAmount };
  }

  async refund(paymentIntentId: string, amountCents?: number): Promise<void> {
    await this.client().refunds.create({
      payment_intent: paymentIntentId,
      ...(amountCents ? { amount: amountCents } : {}),
    });
  }

  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.client().webhooks.constructEvent(payload, signature, this.webhookSecret);
  }
}
