import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConsentSubject } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Enforces that an active (non-revoked) consent exists before clinical access.
 * Health data of minors is special-category data — no consent, no processing.
 */
@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async assertHealthConsent(childId: string): Promise<void> {
    const consent = await this.prisma.consent.findFirst({
      where: {
        childId,
        subject: ConsentSubject.HEALTH_DATA,
        revokedAt: null,
      },
      orderBy: { grantedAt: 'desc' },
    });
    if (!consent) {
      throw new ForbiddenException('Active health-data consent required');
    }
  }

  async record(
    userId: string,
    subject: ConsentSubject,
    version: string,
    childId?: string,
    evidence?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.consent.create({
      data: { userId, childId, subject, version, evidence },
    });
  }
}
