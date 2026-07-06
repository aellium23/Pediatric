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
import { PediatricianStatus, PaymentStatus, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Roles } from '../../common/security/decorators';

class ChangeRoleDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;
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
    return this.prisma.pediatrician.update({
      where: { id },
      data: { status: PediatricianStatus.ACTIVE, licenseVerifiedAt: new Date() },
    });
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
