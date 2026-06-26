import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import type Stripe from 'stripe';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeService } from './stripe.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  /** Pre-payment: create a held PaymentIntent for a consultation. */
  async createIntentForConsultation(userId: string, consultationId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });
    if (!consultation) throw new NotFoundException('Consultation not found');

    const member = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: consultation.familyId },
    });
    if (!member) throw new ForbiddenException('Not authorized');

    // Demo mode (no STRIPE_SECRET_KEY): record a placeholder payment so the
    // booking completes without a real charge, instead of failing with a 503.
    if (!this.stripe.enabled) {
      await this.prisma.payment.upsert({
        where: { consultationId },
        create: {
          consultationId,
          amountCents: consultation.priceCents,
          currency: consultation.currency,
          psp: 'demo',
          pspRef: `demo_${consultationId}`,
          status: PaymentStatus.CREATED,
        },
        update: { status: PaymentStatus.CREATED },
      });
      return { clientSecret: null as string | null };
    }

    const intent = await this.stripe.createPaymentIntent({
      amountCents: consultation.priceCents,
      currency: consultation.currency,
      consultationId,
    });

    await this.prisma.payment.upsert({
      where: { consultationId },
      create: {
        consultationId,
        amountCents: consultation.priceCents,
        currency: consultation.currency,
        psp: 'stripe',
        pspRef: intent.id,
        status: PaymentStatus.CREATED,
      },
      update: { pspRef: intent.id, status: PaymentStatus.CREATED },
    });

    return { clientSecret: intent.clientSecret };
  }

  /** On consultation close: capture funds and transfer the pediatrician's share. */
  async captureAndSplit(
    consultationId: string,
  ): Promise<{ platformFeeCents: number; pediatricianAmount: number }> {
    const payment = await this.prisma.payment.findUnique({
      where: { consultationId },
      include: { split: true, consultation: { include: { pediatrician: true } } },
    });
    // Demo / no-payment mode (no Stripe key, so no PaymentIntent was created):
    // settle as zero so the pediatrician can still close the consultation.
    if (!payment?.pspRef) {
      return { platformFeeCents: 0, pediatricianAmount: 0 };
    }
    if (payment.status === PaymentStatus.CAPTURED && payment.split) {
      // Idempotent: already settled.
      return {
        platformFeeCents: payment.split.platformFeeCents,
        pediatricianAmount: payment.split.pediatricianAmount,
      };
    }
    const account = payment.consultation.pediatrician.stripeAccountId;
    if (!account) throw new BadRequestException('Pediatrician has no payout account');

    const result = await this.stripe.captureAndSplit({
      paymentIntentId: payment.pspRef,
      amountCents: payment.amountCents,
      connectedAccountId: account,
    });

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.CAPTURED, capturedAt: new Date() },
      }),
      this.prisma.split.upsert({
        where: { paymentId: payment.id },
        create: {
          paymentId: payment.id,
          platformFeeCents: result.platformFeeCents,
          pediatricianAmount: result.pediatricianAmount,
        },
        update: {},
      }),
    ]);

    return result;
  }

  /** SLA failure / cancellation: refund and mark the payment. */
  async refundForConsultation(consultationId: string, reason: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { consultationId } });
    if (!payment?.pspRef) return;
    if (
      payment.status === PaymentStatus.REFUNDED ||
      payment.status === PaymentStatus.FAILED
    ) {
      return;
    }
    await this.stripe.refund(payment.pspRef);
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED },
      }),
      this.prisma.refund.create({
        data: { paymentId: payment.id, amountCents: payment.amountCents, reason, status: 'done' },
      }),
    ]);
  }

  /** Reconcile asynchronous Stripe events (idempotent by pspRef). */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.amount_capturable_updated':
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.prisma.payment.updateMany({
          where: { pspRef: pi.id },
          data: {
            status:
              event.type === 'payment_intent.succeeded'
                ? PaymentStatus.CAPTURED
                : PaymentStatus.AUTHORIZED,
            capturedAt: event.type === 'payment_intent.succeeded' ? new Date() : undefined,
          },
        });
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await this.prisma.payment.updateMany({
          where: { pspRef: charge.payment_intent as string },
          data: { status: PaymentStatus.REFUNDED },
        });
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event ${event.type}`);
    }
  }
}
