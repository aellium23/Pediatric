import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConsultationsService } from './consultations.service';

/** Periodically expires consultations past their SLA and triggers auto-refund. */
@Injectable()
export class SlaScheduler {
  private readonly logger = new Logger('SLA');

  constructor(private readonly consultations: ConsultationsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handle(): Promise<void> {
    const count = await this.consultations.expireOverdue();
    if (count > 0) {
      this.logger.warn(`Expired ${count} consultation(s) past SLA; refunds issued.`);
    }
  }
}
