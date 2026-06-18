import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  BillingPort,
  IssueInvoiceInput,
  IssuedInvoice,
} from './invoicing.port';

/**
 * Adapter to a certified AT billing partner (Vendus / InvoiceXpress / Moloni).
 * This stub returns a well-formed document so the orchestration is testable;
 * the real HTTP integration (multi-emitter, ATCUD/QR/SAF-T) lands in Increment 3.
 */
@Injectable()
export class CertifiedPartnerAdapter extends BillingPort {
  private readonly logger = new Logger('Billing');

  async issueInvoice(input: IssueInvoiceInput): Promise<IssuedInvoice> {
    this.logger.log(
      `Issuing ${input.issuer} invoice for consultation ${input.consultationId} (${input.amountCents}c, VAT ${input.vatRegime})`,
    );
    const partnerDocId = randomUUID();
    return {
      partnerDocId,
      atcud: `ATCUD-${partnerDocId.slice(0, 8)}`,
      qrPayload: `A:${input.recipientNif ?? '999999990'}*B:${input.amountCents}`,
      pdfUrl: `https://billing.invalid/docs/${partnerDocId}.pdf`,
    };
  }

  async issueCreditNote(partnerDocId: string, amountCents: number): Promise<IssuedInvoice> {
    const id = randomUUID();
    this.logger.log(`Issuing credit note for ${partnerDocId} (${amountCents}c)`);
    return {
      partnerDocId: id,
      atcud: `ATCUD-NC-${id.slice(0, 8)}`,
      qrPayload: `NC:${amountCents}`,
      pdfUrl: `https://billing.invalid/docs/${id}.pdf`,
    };
  }
}
