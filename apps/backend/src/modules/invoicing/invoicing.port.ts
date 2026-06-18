/** Port (hexagonal) for a certified Portuguese billing partner (AT-compliant). */
export interface IssueInvoiceInput {
  consultationId: string;
  issuer: 'pediatrician' | 'platform';
  recipientName?: string;
  recipientNif?: string;
  amountCents: number;
  vatCents: number;
  vatRegime: 'exempt' | 'standard';
  description: string;
}

export interface IssuedInvoice {
  partnerDocId: string;
  atcud: string;
  qrPayload: string;
  pdfUrl: string;
}

export abstract class BillingPort {
  abstract issueInvoice(input: IssueInvoiceInput): Promise<IssuedInvoice>;
  abstract issueCreditNote(partnerDocId: string, amountCents: number): Promise<IssuedInvoice>;
}

export const BILLING_PORT = Symbol('BILLING_PORT');
