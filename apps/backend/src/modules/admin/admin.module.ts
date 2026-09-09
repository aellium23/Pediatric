import {
  NotFoundException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import {
  AvailabilityKind,
  PediatricianStatus,
  PaymentStatus,
  Role,
  ServiceType,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizeRegion } from '../../common/regions';
import { Roles } from '../../common/security/decorators';

class ChangeRoleDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;
}

// Row shapes of GET /admin/market (exported so declaration emit can name them).
export interface MarketRegionRow {
  region: string;
  families: number;
  children: number;
  consultations: number;
  activePediatricians: number;
  offeredHoursWeek: number;
}

export interface MarketSpecialtyRow {
  specialty: string;
  consultations: number;
  activePediatricians: number;
  avgVideoLeadHours: number | null;
}

class ReviewDocDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

class SetUserStatusDto {
  @ApiProperty({ enum: ['active', 'disabled'] })
  @IsIn(['active', 'disabled'])
  status!: string;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Platform KPIs for the admin/compliance dashboard. */
  async metrics() {
    const [usersByRole, pedsByStatus, consultsByStatus, splits, refunds, families, children] =
      await Promise.all([
        this.prisma.user.groupBy({ by: ['role'], _count: { _all: true }, orderBy: { role: 'asc' } }),
        this.prisma.pediatrician.groupBy({
          by: ['status'],
          _count: { _all: true },
          orderBy: { status: 'asc' },
        }),
        this.prisma.consultation.groupBy({
          by: ['status'],
          _count: { _all: true },
          orderBy: { status: 'asc' },
        }),
        this.prisma.split.findMany({ select: { platformFeeCents: true, pediatricianAmount: true } }),
        this.prisma.payment.count({ where: { status: PaymentStatus.REFUNDED } }),
        this.prisma.family.count(),
        this.prisma.child.count(),
      ]);
    const grossCents = splits.reduce((s, x) => s + x.platformFeeCents + x.pediatricianAmount, 0);
    const commissionCents = splits.reduce((s, x) => s + x.platformFeeCents, 0);
    return {
      usersByRole: Object.fromEntries(usersByRole.map((u) => [u.role, u._count._all])),
      pediatriciansByStatus: Object.fromEntries(
        pedsByStatus.map((p) => [p.status, p._count._all]),
      ),
      consultationsByStatus: Object.fromEntries(
        consultsByStatus.map((c) => [c.status, c._count._all]),
      ),
      grossCents,
      commissionCents,
      refunds,
      families,
      children,
      currency: 'EUR',
    };
  }

  /**
   * Monthly billing/commission series for the FINANCE evolution charts.
   * Buckets by Payment.capturedAt (revenue recognition) and Refund.createdAt;
   * months without movement still appear so charts have a continuous axis.
   */
  async financeSeries(months = 12) {
    const take = Math.min(Math.max(Math.trunc(months) || 12, 1), 36);
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (take - 1), 1);
    const [captured, refunds] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.CAPTURED, capturedAt: { gte: from } },
        select: {
          capturedAt: true,
          split: { select: { platformFeeCents: true, pediatricianAmount: true } },
        },
      }),
      this.prisma.refund.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true, amountCents: true },
      }),
    ]);
    const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const series = new Map<
      string,
      { month: string; grossCents: number; platformCents: number; pediatricianCents: number; refundedCents: number; count: number }
    >();
    for (let i = 0; i < take; i++) {
      const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
      series.set(key(d), {
        month: key(d),
        grossCents: 0,
        platformCents: 0,
        pediatricianCents: 0,
        refundedCents: 0,
        count: 0,
      });
    }
    for (const p of captured) {
      const b = p.capturedAt && series.get(key(p.capturedAt));
      if (!b || !p.split) continue;
      b.grossCents += p.split.platformFeeCents + p.split.pediatricianAmount;
      b.platformCents += p.split.platformFeeCents;
      b.pediatricianCents += p.split.pediatricianAmount;
      b.count += 1;
    }
    for (const r of refunds) {
      const b = series.get(key(r.createdAt));
      if (b) b.refundedCents += r.amountCents;
    }
    return { months: [...series.values()], currency: 'EUR' };
  }

  /**
   * Market supply/demand analytics for expansion decisions.
   *
   * Honest mappings (know what each number really is):
   * - Supply = ACTIVE pediatricians, bucketed by normalizeRegion(region) —
   *   free-text service region mapped to a canonical district/island;
   *   unmatched/missing → 'Sem região'.
   * - offeredHoursWeek = the weekly recurring Availability template (date null,
   *   not closed) in hours per region. VIDEO and MESSAGES windows both count:
   *   each is a distinct offered service channel.
   * - Demand by region comes from Family.region (self-declared; null →
   *   'Sem região'); consultations are attributed to the family's region.
   * - A consultation is attributed to its pediatrician's FIRST specialty (the
   *   headline specialty); pediatricians count once per specialty they list.
   * - avgVideoLeadHours = mean(scheduledAt − openedAt) over VIDEO consultations
   *   in the window — booking lead time, not time-to-answer.
   * - monthly buckets use Consultation.openedAt; newFamilies use
   *   Family.createdAt. Months without movement still appear.
   *
   * Efficiency: families/pediatricians/window-consultations are bounded row
   * sets at MVP scale, so we fetch narrow selections and aggregate in JS
   * (child counts use a DB groupBy). Revisit with SQL GROUP BYs / a
   * reporting table when volumes grow.
   */
  async market(months = 6) {
    const take = Math.min(Math.max(Math.trunc(months) || 6, 1), 24);
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (take - 1), 1);

    const [families, childCounts, consultations, peds] = await Promise.all([
      this.prisma.family.findMany({ select: { id: true, region: true, createdAt: true } }),
      this.prisma.child.groupBy({ by: ['familyId'], _count: { _all: true } }),
      this.prisma.consultation.findMany({
        where: { openedAt: { gte: from } },
        select: {
          familyId: true,
          pediatricianId: true,
          type: true,
          openedAt: true,
          scheduledAt: true,
        },
      }),
      this.prisma.pediatrician.findMany({
        where: { status: PediatricianStatus.ACTIVE },
        select: { id: true, region: true, specialties: true },
      }),
    ]);
    const templates = peds.length
      ? await this.prisma.availability.findMany({
          where: { pediatricianId: { in: peds.map((p) => p.id) }, date: null, closed: false },
          select: { pediatricianId: true, startMinute: true, endMinute: true },
        })
      : [];

    const bucket = (region: string | null | undefined) => normalizeRegion(region) ?? 'Sem região';
    const familyRegion = new Map(families.map((f) => [f.id, bucket(f.region)]));
    const childrenByFamily = new Map(childCounts.map((c) => [c.familyId, c._count._all]));
    const pedRegion = new Map(peds.map((p) => [p.id, bucket(p.region)]));
    const pedFirstSpecialty = new Map(peds.map((p) => [p.id, p.specialties[0] ?? 'general']));

    // ── Regions ──
    const regionRows = new Map<string, MarketRegionRow>();
    const regionRow = (region: string): MarketRegionRow => {
      let row = regionRows.get(region);
      if (!row) {
        row = { region, families: 0, children: 0, consultations: 0, activePediatricians: 0, offeredHoursWeek: 0 };
        regionRows.set(region, row);
      }
      return row;
    };
    for (const f of families) {
      const row = regionRow(familyRegion.get(f.id) as string);
      row.families += 1;
      row.children += childrenByFamily.get(f.id) ?? 0;
    }
    for (const c of consultations) {
      regionRow(familyRegion.get(c.familyId) ?? 'Sem região').consultations += 1;
    }
    for (const p of peds) {
      regionRow(pedRegion.get(p.id) as string).activePediatricians += 1;
    }
    for (const t of templates) {
      const row = regionRow(pedRegion.get(t.pediatricianId) ?? 'Sem região');
      row.offeredHoursWeek += (t.endMinute - t.startMinute) / 60;
    }
    for (const row of regionRows.values()) {
      row.offeredHoursWeek = Math.round(row.offeredHoursWeek * 10) / 10;
    }

    // ── Specialties ──
    type SpecAcc = Omit<MarketSpecialtyRow, 'avgVideoLeadHours'> & {
      leadSumHours: number;
      leadCount: number;
    };
    const specRows = new Map<string, SpecAcc>();
    const specRow = (specialty: string): SpecAcc => {
      let row = specRows.get(specialty);
      if (!row) {
        row = { specialty, consultations: 0, activePediatricians: 0, leadSumHours: 0, leadCount: 0 };
        specRows.set(specialty, row);
      }
      return row;
    };
    for (const p of peds) {
      const specialties = p.specialties.length ? p.specialties : ['general'];
      for (const s of specialties) specRow(s).activePediatricians += 1;
    }
    for (const c of consultations) {
      const row = specRow(pedFirstSpecialty.get(c.pediatricianId) ?? 'general');
      row.consultations += 1;
      if (c.type === ServiceType.VIDEO && c.scheduledAt) {
        const leadHours = (c.scheduledAt.getTime() - c.openedAt.getTime()) / 3_600_000;
        if (leadHours >= 0) {
          row.leadSumHours += leadHours;
          row.leadCount += 1;
        }
      }
    }

    // ── Monthly ──
    const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthly = new Map<
      string,
      { month: string; consultations: number; newFamilies: number; byServiceType: Record<string, number> }
    >();
    for (let i = 0; i < take; i++) {
      const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
      monthly.set(key(d), { month: key(d), consultations: 0, newFamilies: 0, byServiceType: {} });
    }
    for (const c of consultations) {
      const b = monthly.get(key(c.openedAt));
      if (!b) continue;
      b.consultations += 1;
      b.byServiceType[c.type] = (b.byServiceType[c.type] ?? 0) + 1;
    }
    for (const f of families) {
      const b = monthly.get(key(f.createdAt));
      if (b) b.newFamilies += 1;
    }

    return {
      regions: [...regionRows.values()].sort((a, b) => b.families - a.families),
      specialties: [...specRows.values()]
        .map(({ leadSumHours, leadCount, ...rest }) => ({
          ...rest,
          avgVideoLeadHours: leadCount
            ? Math.round((leadSumHours / leadCount) * 10) / 10
            : null,
        }))
        .sort((a, b) => b.consultations - a.consultations),
      monthly: [...monthly.values()],
    };
  }

  /** Verification queue: pediatricians filtered by status (default PENDING). */
  async listPediatricians(status?: PediatricianStatus) {
    return this.prisma.pediatrician.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } },
      take: 100,
    });
  }

  async verifyPediatrician(id: string) {
    const ped = await this.prisma.pediatrician.update({
      where: { id },
      data: { status: PediatricianStatus.ACTIVE, licenseVerifiedAt: new Date() },
    });
    // Sensible default message hours (Mon–Fri 9h–19h) so the reply estimate
    // never starts empty — the pediatrician can edit them in the agenda.
    const hasWindows = await this.prisma.availability.count({
      where: { pediatricianId: id, kind: AvailabilityKind.MESSAGES },
    });
    if (!hasWindows) {
      await this.prisma.availability.createMany({
        data: [1, 2, 3, 4, 5].map((weekday) => ({
          pediatricianId: id,
          kind: AvailabilityKind.MESSAGES,
          weekday,
          startMinute: 9 * 60,
          endMinute: 19 * 60,
        })),
      });
    }
    return ped;
  }

  async suspendPediatrician(id: string) {
    return this.prisma.pediatrician.update({
      where: { id },
      data: { status: PediatricianStatus.SUSPENDED },
    });
  }

  async listUsers(q?: string) {
    const query = q?.trim();
    return this.prisma.user.findMany({
      where: query
        ? {
            OR: [
              { id: query },
              { email: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query } },
            ],
          }
        : undefined,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /**
   * Support "user 360": the profile plus their consultation timeline (as a
   * family member and/or as the assigned pediatrician) — so tier-1 can see
   * the case a caller is asking about without financial or clinical payloads.
   */
  async userDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, phone: true, role: true, status: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    const memberships = await this.prisma.familyMember.findMany({ where: { userId: id } });
    const ped = await this.prisma.pediatrician.findUnique({ where: { userId: id } });
    const consultations = await this.prisma.consultation.findMany({
      where: {
        OR: [
          ...(memberships.length ? [{ familyId: { in: memberships.map((m) => m.familyId) } }] : []),
          ...(ped ? [{ pediatricianId: ped.id }] : []),
        ],
      },
      orderBy: { openedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        status: true,
        openedAt: true,
        closedAt: true,
        scheduledAt: true,
        child: { select: { name: true } },
        pediatrician: { select: { displayName: true } },
      },
    });
    return { user, consultations };
  }

  async changeRole(id: string, role: Role) {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true },
    });
  }

  /**
   * Activate/deactivate a user account. Disabling revokes the refresh tokens
   * so access ends when the short-lived access token expires (the JWT strategy
   * is stateless by design) and login is refused while disabled (see
   * AuthService). Reactivating simply clears the flag; the user logs in again.
   */
  async setUserStatus(id: string, status: string) {
    const next = status === 'disabled' ? 'disabled' : 'active';
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: next },
      select: { id: true, email: true, status: true },
    });
    if (next === 'disabled') {
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    }
    return user;
  }

  async audit(skip = 0, take = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: Math.max(0, skip),
      take: Math.min(Math.max(take, 1), 200),
      include: { actor: { select: { email: true, role: true } } },
    });
  }

  /** Credential documents submitted by a given pediatrician. */
  async listDocuments(pediatricianId: string) {
    return this.prisma.verificationDocument.findMany({
      where: { pediatricianId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Compliance approves/rejects a credential document. */
  async reviewDocument(id: string, status: string, note?: string) {
    return this.prisma.verificationDocument.update({
      where: { id },
      data: { status, note, reviewedAt: new Date() },
    });
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('metrics')
  @Roles(Role.PLATFORM_ADMIN, Role.COMPLIANCE, Role.FINANCE)
  metrics() {
    return this.service.metrics();
  }

  @Get('finance/series')
  @Roles(Role.PLATFORM_ADMIN, Role.FINANCE)
  financeSeries(@Query('months') months?: string) {
    return this.service.financeSeries(months ? Number(months) : 12);
  }

  @Get('market')
  @Roles(Role.PLATFORM_ADMIN, Role.FINANCE)
  market(@Query('months') months?: string) {
    return this.service.market(months ? Number(months) : 6);
  }

  @Get('pediatricians')
  @Roles(Role.PLATFORM_ADMIN, Role.COMPLIANCE, Role.SUPPORT)
  pediatricians(@Query('status') status?: PediatricianStatus) {
    return this.service.listPediatricians(status);
  }

  @Post('pediatricians/:id/verify')
  @Roles(Role.PLATFORM_ADMIN, Role.COMPLIANCE)
  verify(@Param('id') id: string) {
    return this.service.verifyPediatrician(id);
  }

  @Post('pediatricians/:id/suspend')
  @Roles(Role.PLATFORM_ADMIN, Role.COMPLIANCE)
  suspend(@Param('id') id: string) {
    return this.service.suspendPediatrician(id);
  }

  @Get('users')
  @Roles(Role.PLATFORM_ADMIN, Role.SUPPORT)
  users(@Query('q') q?: string) {
    return this.service.listUsers(q);
  }

  @Get('users/:id')
  @Roles(Role.PLATFORM_ADMIN, Role.SUPPORT)
  userDetail(@Param('id') id: string) {
    return this.service.userDetail(id);
  }

  @Patch('users/:id/role')
  @Roles(Role.PLATFORM_ADMIN)
  changeRole(@Param('id') id: string, @Body() dto: ChangeRoleDto) {
    return this.service.changeRole(id, dto.role);
  }

  @Patch('users/:id/status')
  @Roles(Role.PLATFORM_ADMIN)
  setUserStatus(@Param('id') id: string, @Body() dto: SetUserStatusDto) {
    return this.service.setUserStatus(id, dto.status);
  }

  @Get('audit')
  @Roles(Role.PLATFORM_ADMIN, Role.COMPLIANCE)
  audit(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.service.audit(skip ? Number(skip) : 0, take ? Number(take) : 100);
  }

  @Get('pediatricians/:id/documents')
  @Roles(Role.PLATFORM_ADMIN, Role.COMPLIANCE, Role.SUPPORT)
  documents(@Param('id') id: string) {
    return this.service.listDocuments(id);
  }

  @Post('documents/:docId/review')
  @Roles(Role.PLATFORM_ADMIN, Role.COMPLIANCE)
  reviewDocument(@Param('docId') docId: string, @Body() dto: ReviewDocDto) {
    return this.service.reviewDocument(docId, dto.status, dto.note);
  }
}

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
