import { Controller, Get, Injectable, Module, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from 'throttler';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { ChildAccessService } from '../../common/security/child-access.service';
import { CurrentUser, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';
import { findMilestone } from '../../common/development/milestones';
import { FhirBundle, toBundle } from './fhir';

/**
 * Interoperability: the child's record leaving the platform in a format that
 * is not ours.
 *
 * Two rights meet here. GDPR art. 20 says a family may take a machine-readable
 * copy of their data with them; the EHDS (applicable 26 March 2027, first data
 * exchange March 2029) says a European record has a shape, and that shape is
 * built on FHIR. One export serves both, and building it now — while the
 * database holds pilot data — is the cheapest this will ever be.
 */
@Injectable()
export class FhirExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
    private readonly access: ChildAccessService,
  ) {}

  /**
   * The clinical record of one child as a FHIR R4 Bundle.
   *
   * Access is checked with the same rule as the rest of the record, and the
   * controller narrows it further to the parent: a pediatrician reads the
   * chart inside the consultation they are part of, and does not need a bulk
   * download of a family's record to do that.
   */
  async childBundle(user: AuthenticatedUser, childId: string): Promise<FhirBundle> {
    const child = await this.access.assertAccess(user, childId);
    const [growth, vitals, allergies, vaccines, medications, episodes, milestones, documents] =
      await Promise.all([
        this.prisma.growthMeasurement.findMany({
          where: { childId },
          orderBy: { measuredAt: 'asc' },
        }),
        this.prisma.vital.findMany({ where: { childId }, orderBy: { measuredAt: 'asc' } }),
        this.prisma.allergy.findMany({ where: { childId }, orderBy: { createdAt: 'asc' } }),
        this.prisma.vaccination.findMany({ where: { childId }, orderBy: { date: 'asc' } }),
        this.prisma.medication.findMany({ where: { childId }, orderBy: { createdAt: 'asc' } }),
        this.prisma.episode.findMany({ where: { childId }, orderBy: { createdAt: 'asc' } }),
        this.prisma.developmentMilestone.findMany({
          where: { childId },
          orderBy: { achievedAt: 'asc' },
        }),
        // Metadata only — `content` (the encrypted file) is deliberately not
        // selected, so a multi-megabyte PDF cannot end up inside the JSON.
        this.prisma.childDocument.findMany({
          where: { childId },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            kind: true,
            mime: true,
            sizeBytes: true,
            issuedAt: true,
            createdAt: true,
          },
        }),
      ]);

    return toBundle({
      child: {
        id: child.id,
        name: child.name,
        birthDate: child.birthDate,
        sex: child.sex,
        snsNumber: this.crypto.decryptSafe(child.snsNumber),
      },
      growth,
      vitals,
      allergies: allergies.map((a) => ({ ...a, label: this.crypto.decryptSafe(a.label) ?? '' })),
      vaccines: vaccines.map((v) => ({
        ...v,
        name: this.crypto.decryptSafe(v.name) ?? '',
        notes: this.crypto.decryptSafe(v.notes),
      })),
      medications: medications.map((m) => ({
        ...m,
        name: this.crypto.decryptSafe(m.name) ?? '',
        dose: this.crypto.decryptSafe(m.dose),
      })),
      episodes: episodes.map((e) => ({
        ...e,
        title: this.crypto.decryptSafe(e.title) ?? '',
        summary: this.crypto.decryptSafe(e.summary),
      })),
      documents,
      // The catalogue wording travels with the row: the code alone is opaque
      // to a receiver, and the row alone has no label.
      milestones: milestones.flatMap((m) => {
        const item = findMilestone(m.code);
        if (!item) return [];
        return [
          {
            id: m.id,
            code: m.code,
            label: item.pt,
            achievedAt: m.achievedAt,
            note: this.crypto.decryptSafe(m.note),
          },
        ];
      }),
    });
  }

  /** Every child a parent holds, for the GDPR export to carry in one file. */
  async bundlesForUser(user: AuthenticatedUser): Promise<FhirBundle[]> {
    if (user.role !== Role.PARENT) return [];
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId: user.userId },
      select: { familyId: true },
    });
    const children = await this.prisma.child.findMany({
      where: { familyId: { in: memberships.map((m) => m.familyId) } },
      select: { id: true },
    });
    return Promise.all(children.map((c) => this.childBundle(user, c.id)));
  }
}

@ApiTags('interop')
@ApiBearerAuth()
@Controller('interop')
class InteropController {
  constructor(private readonly service: FhirExportService) {}

  /**
   * Parent-only on purpose. This is portability — the family taking their own
   * record elsewhere — not a clinical read, and a bulk export is a different
   * egress shape from reading a chart during a consultation.
   */
  @Get('fhir/:childId')
  @Roles(Role.PARENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  childBundle(@CurrentUser() user: AuthenticatedUser, @Param('childId') childId: string) {
    return this.service.childBundle(user, childId);
  }
}

@Module({
  controllers: [InteropController],
  providers: [FhirExportService],
  exports: [FhirExportService],
})
export class InteropModule {}
