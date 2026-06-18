import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * Stripe Connect integration (separate charges & transfers / escrow-like).
 * Funds are held on the platform and transferred to the pediatrician's
 * connected account on consultation close, retaining the platform fee.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger('Stripe');
  private readonly stripe: Stripe;
  private readonly platformFeeBps: number;
  readonly webhookSecret: string;

  constructor(config: ConfigService) {
    this.stripe = new Stripe(config.get('stripe.secretKey')!, {
      apiVersion: '2024-06-20',
    });
    this.platformFeeBps = config.get<number>('stripe.platformFeeBps')!;
    this.webhookSecret = config.get('stripe.webhookSecret')!;
  }

  /** Onboard a pediatrician as a connected account (Express). */
  async createConnectedAccount(email: string): Promise<string> {
    const account = await this.stripe.accounts.create({
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
    const link = await this.stripe.accountLinks.create({
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
    const intent = await this.stripe.paymentIntents.create({
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
    await this.stripe.paymentIntents.capture(params.paymentIntentId);

    const platformFeeCents = Math.round((params.amountCents * this.platformFeeBps) / 10000);
    const pediatricianAmount = params.amountCents - platformFeeCents;

    await this.stripe.transfers.create({
      amount: pediatricianAmount,
      currency: 'eur',
      destination: params.connectedAccountId,
      transfer_group: params.paymentIntentId,
    });

    return { platformFeeCents, pediatricianAmount };
  }

  async refund(paymentIntentId: string, amountCents?: number): Promise<void> {
    await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amountCents ? { amount: amountCents } : {}),
    });
  }

  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }
}
