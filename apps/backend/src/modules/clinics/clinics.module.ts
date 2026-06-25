import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrentUser, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';

class CreateClinicDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() taxId?: string;
}
class AddStaffDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty({ enum: [Role.CLINIC_ADMIN, Role.CLINIC_STAFF] })
  @IsEnum(Role)
  role!: Role;
}
class AddPediatricianDto {
  @ApiProperty() @IsUUID() pediatricianId!: string;
  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  revenueSharePct?: number;
}

@Injectable()
export class ClinicsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Throws unless the user is a CLINIC_ADMIN of the clinic (or a platform admin). */
  private async assertManage(user: AuthenticatedUser, clinicId: string) {
    if (user.role === Role.PLATFORM_ADMIN) return;
    const m = await this.prisma.clinicMember.findFirst({
      where: { clinicId, userId: user.userId, role: Role.CLINIC_ADMIN },
    });
    if (!m) throw new ForbiddenException('Not a clinic admin');
  }

  /** Dashboard for the clinic the current user belongs to. */
  async myClinic(userId: string) {
    const membership = await this.prisma.clinicMember.findFirst({
      where: { userId },
      include: { clinic: true },
    });
    if (!membership) return null;
    const clinic = membership.clinic;

    const [members, links] = await Promise.all([
      this.prisma.clinicMember.findMany({ where: { clinicId: clinic.id } }),
      this.prisma.clinicPediatrician.findMany({ where: { clinicId: clinic.id } }),
    ]);
    const [memberUsers, peds, consultations] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: members.map((m) => m.userId) } },
        select: { id: true, email: true },
      }),
      this.prisma.pediatrician.findMany({
        where: { id: { in: links.map((l) => l.pediatricianId) } },
        include: { user: { select: { email: true } } },
      }),
      this.prisma.consultation.findMany({
        where: { pediatricianId: { in: links.map((l) => l.pediatricianId) } },
        orderBy: { openedAt: 'desc' },
        take: 50,
      }),
    ]);
    const emailById = Object.fromEntries(memberUsers.map((u) => [u.id, u.email]));

    return {
      clinic,
      role: membership.role,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        email: emailById[m.userId] ?? null,
      })),
      pediatricians: peds.map((p) => ({
        id: p.id,
        email: p.user?.email ?? null,
        status: p.status,
        ratingAvg: p.ratingAvg,
        revenueSharePct: links.find((l) => l.pediatricianId === p.id)?.revenueSharePct ?? 0,
      })),
      consultations,
    };
  }

  async create(user: AuthenticatedUser, dto: CreateClinicDto) {
    const clinic = await this.prisma.clinic.create({ data: { name: dto.name, taxId: dto.taxId } });
    // The creating clinic admin becomes the first member.
    if (user.role === Role.CLINIC_ADMIN) {
      await this.prisma.clinicMember.create({
        data: { clinicId: clinic.id, userId: user.userId, role: Role.CLINIC_ADMIN },
      });
    }
    return clinic;
  }

  async addStaff(user: AuthenticatedUser, clinicId: string, dto: AddStaffDto) {
    await this.assertManage(user, clinicId);
    let member = await this.prisma.user.findUnique({ where: { email: dto.email } });
    member ??= await this.prisma.user.create({
      data: { email: dto.email, emailVerified: true, role: dto.role },
    });
    return this.prisma.clinicMember.upsert({
      where: { clinicId_userId: { clinicId, userId: member.id } },
      create: { clinicId, userId: member.id, role: dto.role },
      update: { role: dto.role },
    });
  }

  async removeStaff(user: AuthenticatedUser, clinicId: string, userId: string) {
    await this.assertManage(user, clinicId);
    await this.prisma.clinicMember.deleteMany({ where: { clinicId, userId } });
    return { removed: true };
  }

  async addPediatrician(user: AuthenticatedUser, clinicId: string, dto: AddPediatricianDto) {
    await this.assertManage(user, clinicId);
    const ped = await this.prisma.pediatrician.findUnique({ where: { id: dto.pediatricianId } });
    if (!ped) throw new NotFoundException('Pediatrician not found');
    return this.prisma.clinicPediatrician.upsert({
      where: {
        clinicId_pediatricianId: { clinicId, pediatricianId: dto.pediatricianId },
      },
      create: {
        clinicId,
        pediatricianId: dto.pediatricianId,
        revenueSharePct: dto.revenueSharePct ?? 20,
      },
      update: { revenueSharePct: dto.revenueSharePct ?? 20 },
    });
  }

  async removePediatrician(user: AuthenticatedUser, clinicId: string, pediatricianId: string) {
    await this.assertManage(user, clinicId);
    await this.prisma.clinicPediatrician.deleteMany({ where: { clinicId, pediatricianId } });
    return { removed: true };
  }
}

@ApiTags('clinics')
@ApiBearerAuth()
@Controller('clinics')
class ClinicsController {
  constructor(private readonly service: ClinicsService) {}

  @Get('me')
  @Roles(Role.CLINIC_ADMIN, Role.CLINIC_STAFF)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.service.myClinic(user.userId);
  }

  @Post()
  @Roles(Role.CLINIC_ADMIN, Role.PLATFORM_ADMIN)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClinicDto) {
    return this.service.create(user, dto);
  }

  @Post(':id/staff')
  @Roles(Role.CLINIC_ADMIN, Role.PLATFORM_ADMIN)
  addStaff(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddStaffDto) {
    return this.service.addStaff(user, id, dto);
  }

  @Delete(':id/staff/:userId')
  @Roles(Role.CLINIC_ADMIN, Role.PLATFORM_ADMIN)
  removeStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.service.removeStaff(user, id, userId);
  }

  @Post(':id/pediatricians')
  @Roles(Role.CLINIC_ADMIN, Role.PLATFORM_ADMIN)
  addPediatrician(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddPediatricianDto,
  ) {
    return this.service.addPediatrician(user, id, dto);
  }

  @Delete(':id/pediatricians/:pedId')
  @Roles(Role.CLINIC_ADMIN, Role.PLATFORM_ADMIN)
  removePediatrician(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('pedId') pedId: string,
  ) {
    return this.service.removePediatrician(user, id, pedId);
  }
}

@Module({
  controllers: [ClinicsController],
  providers: [ClinicsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}
