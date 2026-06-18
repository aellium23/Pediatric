import {
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
