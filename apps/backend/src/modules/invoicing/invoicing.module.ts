import { Module } from '@nestjs/common';
import { InvoicingService } from './invoicing.service';
import { CertifiedPartnerAdapter } from './certified-partner.adapter';
import { BILLING_PORT } from './invoicing.port';

@Module({
  providers: [
    InvoicingService,
    { provide: BILLING_PORT, useClass: CertifiedPartnerAdapter },
  ],
  exports: [BILLING_PORT],
})
export class InvoicingModule {}
