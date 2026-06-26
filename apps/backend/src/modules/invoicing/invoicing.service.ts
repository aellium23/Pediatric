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

    // Gross paid by the family = pediatrician's share + platform fee. Derive it
    // once so the issued document and the stored record can never drift (in the
    // happy path it equals consultation.priceCents, but the captured split is
    // the source of truth for what was actually billed).
    const grossCents = event.pediatricianAmount + event.platformFeeCents;

    const issued = await this.billing.issueInvoice({
      consultationId: consultation.id,
      issuer: 'pediatrician',
      amountCents: grossCents,
      vatCents: 0,
      vatRegime: 'exempt',
      description: `Consulta de pediatria (${consultation.type})`,
    });

    await this.prisma.invoice.create({
      data: {
        consultationId: consultation.id,
        issuer: 'pediatrician',
        amountCents: grossCents,
        vatCents: 0,
        vatRegime: 'exempt',
        atcud: issued.atcud,
        partnerDocId: issued.partnerDocId,
        pdfUrl: issued.pdfUrl,
      },
    });

    // Platform commission invoice issued to the pediatrician (VAT standard).
    const commissionVat = Math.round(event.platformFeeCents * 0.23);
    const commissionDoc = await this.billing.issueInvoice({
      consultationId: consultation.id,
      issuer: 'platform',
      amountCents: event.platformFeeCents,
      vatCents: commissionVat,
      vatRegime: 'standard',
      description: 'Comissão de intermediação HOC',
    });

    await this.prisma.commissionInvoice.create({
      data: {
        consultationId: consultation.id,
        pediatricianId: consultation.pediatricianId,
        amountCents: event.platformFeeCents,
        vatCents: commissionVat,
        vatRegime: 'standard',
        atcud: commissionDoc.atcud,
        partnerDocId: commissionDoc.partnerDocId,
        pdfUrl: commissionDoc.pdfUrl,
      },
    });
  }
}
