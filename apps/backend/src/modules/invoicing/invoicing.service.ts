import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BILLING_PORT, BillingPort } from './invoicing.port';
import { PaymentCapturedEvent } from '../consultations/events';

/**
 * Issues the medical-act invoice (in the pediatrician's name) when a payment
 * is captured. The platform-commission invoice to the pediatrician is added
 * alongside in Increment 3. Medical act is treated as VAT-exempt (to validate
 * with a tax adviser — see docs/12).
 */
@Injectable()
export class InvoicingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BILLING_PORT) private readonly billing: BillingPort,
  ) {}

  @OnEvent('payment.captured')
  async onPaymentCaptured(event: PaymentCapturedEvent): Promise<void> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: event.consultationId },
    });
    if (!consultation) return;

    // Idempotency: skip if already invoiced.
    const existing = await this.prisma.invoice.findUnique({
      where: { consultationId: consultation.id },
    });
    if (existing) return;

    const issued = await this.billing.issueInvoice({
      consultationId: consultation.id,
      issuer: 'pediatrician',
      amountCents: event.pediatricianAmount + event.platformFeeCents,
      vatCents: 0,
      vatRegime: 'exempt',
      description: `Consulta de pediatria (${consultation.type})`,
    });

    await this.prisma.invoice.create({
      data: {
        consultationId: consultation.id,
        issuer: 'pediatrician',
        amountCents: consultation.priceCents,
        vatCents: 0,
        vatRegime: 'exempt',
        atcud: issued.atcud,
        partnerDocId: issued.partnerDocId,
        pdfUrl: issued.pdfUrl,
      },
    });
  }
}
