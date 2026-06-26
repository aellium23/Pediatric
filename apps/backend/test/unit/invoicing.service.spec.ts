import { InvoicingService } from '../../src/modules/invoicing/invoicing.service';
import { PaymentCapturedEvent } from '../../src/modules/consultations/events';

function build(over: { prisma?: Record<string, any> } = {}) {
  const prisma: any = {
    consultation: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'c1', type: 'MESSAGE', priceCents: 4500, pediatricianId: 'ped1' }),
    },
    invoice: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
    commissionInvoice: { create: jest.fn().mockResolvedValue({}) },
    ...over.prisma,
  };
  const billing = {
    issueInvoice: jest
      .fn()
      .mockResolvedValue({ atcud: 'AT-1', partnerDocId: 'doc-1', pdfUrl: 'https://pdf' }),
  };
  const service = new InvoicingService(prisma as any, billing as any);
  return { service, prisma, billing };
}

describe('InvoicingService.onPaymentCaptured', () => {
  it('skips silently when the consultation no longer exists', async () => {
    const { service, billing } = build({
      prisma: { consultation: { findUnique: jest.fn().mockResolvedValue(null) } },
    });
    await service.onPaymentCaptured(new PaymentCapturedEvent('gone', 900, 3600));
    expect(billing.issueInvoice).not.toHaveBeenCalled();
  });

  it('is idempotent — does not re-issue when an invoice already exists', async () => {
    const { service, billing, prisma } = build({
      prisma: { invoice: { findUnique: jest.fn().mockResolvedValue({ id: 'inv1' }), create: jest.fn() } },
    });
    await service.onPaymentCaptured(new PaymentCapturedEvent('c1', 900, 3600));
    expect(billing.issueInvoice).not.toHaveBeenCalled();
    expect(prisma.invoice.create).not.toHaveBeenCalled();
  });

  it('issues a VAT-exempt medical-act invoice for the full gross (share + fee)', async () => {
    const { service, billing, prisma } = build();
    await service.onPaymentCaptured(new PaymentCapturedEvent('c1', 900, 3600));

    // Document sent to the certified partner.
    expect(billing.issueInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ issuer: 'pediatrician', amountCents: 4500, vatRegime: 'exempt', vatCents: 0 }),
    );
    // Stored record must match the issued document exactly (no drift).
    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountCents: 4500, atcud: 'AT-1', partnerDocId: 'doc-1' }),
      }),
    );
  });

  it('issues a commission invoice to the pediatrician with 23% VAT on the fee', async () => {
    const { service, billing, prisma } = build();
    await service.onPaymentCaptured(new PaymentCapturedEvent('c1', 900, 3600));

    // 23% of 900 = 207.
    expect(billing.issueInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ issuer: 'platform', amountCents: 900, vatCents: 207, vatRegime: 'standard' }),
    );
    expect(prisma.commissionInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pediatricianId: 'ped1',
          amountCents: 900,
          vatCents: 207,
        }),
      }),
    );
  });

  it('stores a gross that equals share + fee even if it diverges from priceCents', async () => {
    // Captured split sums to 5000 while the stale priceCents says 4500 — the
    // invoice must follow what was actually billed, not the stale price.
    const { service, prisma } = build();
    await service.onPaymentCaptured(new PaymentCapturedEvent('c1', 1000, 4000));
    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amountCents: 5000 }) }),
    );
  });
});
