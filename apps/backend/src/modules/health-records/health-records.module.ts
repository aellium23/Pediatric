import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { CurrentUser, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';
import { evaluate, evaluateBmi, centileBands, sexCode } from '../../common/growth/who-growth';

class GrowthDto {
  @ApiProperty() @IsDateString() measuredAt!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() heightCm?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() weightKg?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() headCm?: number;
}
class VaccineDto {
  @ApiProperty() @IsString() @MaxLength(200) name!: string;
  @ApiProperty() @IsDateString() date!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(40) pnvAbbr?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(20) cvx?: string;
}
class MedicationDto {
  @ApiProperty() @IsString() @MaxLength(200) name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(200) dose?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() startedAt?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(20) atcCode?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(40) route?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(40) frequency?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() durationDays?: number;
}
class EpisodeDto {
  @ApiProperty() @IsString() @MaxLength(200) title!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(2000) summary?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(20) icpc2Code?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(20) icd10Code?: string;
}
class ActiveDto {
  @ApiProperty() @IsBoolean() active!: boolean;
}
class VitalDto {
  @ApiProperty() @IsDateString() measuredAt!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() temperatureC?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() heartRateBpm?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() respRateBpm?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() spo2Pct?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() systolicMmHg?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() diastolicMmHg?: number;
}

@Injectable()
export class HealthRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
  ) {}

  /** Parent must own the child; pediatrician must share a consultation with them.
   *  Returns the child so callers can use its birthDate/sex (e.g. WHO percentiles). */
  private async assertAccess(user: AuthenticatedUser, childId: string) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new ForbiddenException('Child not found');
    if (user.role === Role.PARENT) {
      const member = await this.prisma.familyMember.findFirst({
        where: { userId: user.userId, familyId: child.familyId },
      });
      if (!member) throw new ForbiddenException('Not authorized for this child');
      return child;
    }
    if (user.role === Role.PEDIATRICIAN) {
      const ped = await this.prisma.pediatrician.findUnique({ where: { userId: user.userId } });
      const link = ped
        ? await this.prisma.consultation.findFirst({
            where: { childId, pediatricianId: ped.id },
          })
        : null;
      if (!link) throw new ForbiddenException('No consultation with this child');
      return child;
    }
    throw new ForbiddenException('Not authorized');
  }

  async overview(user: AuthenticatedUser, childId: string) {
    const child = await this.assertAccess(user, childId);
    const [growth, vaccines, medications, episodes, vitals] = await Promise.all([
      this.prisma.growthMeasurement.findMany({ where: { childId }, orderBy: { measuredAt: 'asc' } }),
      this.prisma.vaccination.findMany({ where: { childId }, orderBy: { date: 'desc' } }),
      this.prisma.medication.findMany({ where: { childId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.episode.findMany({ where: { childId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.vital.findMany({ where: { childId }, orderBy: { measuredAt: 'desc' }, take: 50 }),
    ]);

    // WHO percentiles (0–5y): needs the child's sex and age at each measurement.
    const sex = sexCode(child.sex);
    const ageDaysAt = (when: Date) =>
      Math.floor((when.getTime() - new Date(child.birthDate).getTime()) / 86_400_000);
    return {
      who: sex ? { sex: sex === 1 ? 'M' : 'F', source: 'WHO Child Growth Standards 0–5y' } : null,
      growth: growth.map((g) => {
        const ageDays = ageDaysAt(g.measuredAt);
        const bmi =
          g.heightCm && g.weightKg
            ? Math.round((g.weightKg / Math.pow(g.heightCm / 100, 2)) * 10) / 10
            : null;
        const wfa = sex && g.weightKg ? evaluate('wfa', sex, ageDays, g.weightKg) : null;
        const lhfa = sex && g.heightCm ? evaluate('lhfa', sex, ageDays, g.heightCm) : null;
        const bfa = sex && bmi ? evaluateBmi(sex, ageDays, bmi) : null;
        return {
          id: g.id,
          measuredAt: g.measuredAt,
          ageDays,
          heightCm: g.heightCm,
          weightKg: g.weightKg,
          headCm: g.headCm,
          bmi,
          weightP: wfa?.percentile ?? null,
          weightZ: wfa?.z ?? null,
          heightP: lhfa?.percentile ?? null,
          heightZ: lhfa?.z ?? null,
          bmiP: bfa?.percentile ?? null,
          bmiZ: bfa?.z ?? null,
          bmiClass: bfa?.classification ?? null,
        };
      }),
      vaccines: vaccines.map((v) => ({
        id: v.id,
        name: this.crypto.decrypt(v.name),
        date: v.date,
        notes: this.crypto.decrypt(v.notes),
        pnvAbbr: v.pnvAbbr,
        cvx: v.cvx,
      })),
      medications: medications.map((m) => ({
        id: m.id,
        name: this.crypto.decrypt(m.name),
        dose: this.crypto.decrypt(m.dose),
        atcCode: m.atcCode,
        route: m.route,
        frequency: m.frequency,
        durationDays: m.durationDays,
        active: m.active,
        startedAt: m.startedAt,
      })),
      episodes: episodes.map((e) => ({
        id: e.id,
        title: this.crypto.decrypt(e.title),
        summary: this.crypto.decrypt(e.summary),
        icpc2Code: e.icpc2Code,
        icd10Code: e.icd10Code,
        status: e.status,
        createdAt: e.createdAt,
        closedAt: e.closedAt,
      })),
      vitals: vitals.map((v) => ({
        id: v.id,
        measuredAt: v.measuredAt,
        temperatureC: v.temperatureC,
        heartRateBpm: v.heartRateBpm,
        respRateBpm: v.respRateBpm,
        spo2Pct: v.spo2Pct,
        systolicMmHg: v.systolicMmHg,
        diastolicMmHg: v.diastolicMmHg,
      })),
      // WHO P3–P97 reference curves for the chart to draw under the child's
      // points (only when sex is known and there is something to plot).
      whoBands:
        sex && growth.length
          ? (() => {
              const maxAge = Math.max(...growth.map((g) => ageDaysAt(g.measuredAt)), 0);
              return {
                wfa: centileBands('wfa', sex, maxAge),
                lhfa: centileBands('lhfa', sex, maxAge),
                bfa: centileBands('bfa', sex, maxAge),
              };
            })()
          : null,
    };
  }

  async addVital(user: AuthenticatedUser, childId: string, dto: VitalDto) {
    await this.assertAccess(user, childId);
    return this.prisma.vital.create({
      data: {
        childId,
        measuredAt: new Date(dto.measuredAt),
        temperatureC: dto.temperatureC,
        heartRateBpm: dto.heartRateBpm,
        respRateBpm: dto.respRateBpm,
        spo2Pct: dto.spo2Pct,
        systolicMmHg: dto.systolicMmHg,
        diastolicMmHg: dto.diastolicMmHg,
      },
    });
  }

  async addGrowth(user: AuthenticatedUser, childId: string, dto: GrowthDto) {
    await this.assertAccess(user, childId);
    return this.prisma.growthMeasurement.create({
      data: {
        childId,
        measuredAt: new Date(dto.measuredAt),
        heightCm: dto.heightCm,
        weightKg: dto.weightKg,
        headCm: dto.headCm,
      },
    });
  }

  async addVaccine(user: AuthenticatedUser, childId: string, dto: VaccineDto) {
    await this.assertAccess(user, childId);
    return this.prisma.vaccination.create({
      data: {
        childId,
        name: this.crypto.encrypt(dto.name) as string,
        date: new Date(dto.date),
        notes: this.crypto.encrypt(dto.notes),
        pnvAbbr: dto.pnvAbbr,
        cvx: dto.cvx,
      },
    });
  }

  async addMedication(user: AuthenticatedUser, childId: string, dto: MedicationDto) {
    await this.assertAccess(user, childId);
    return this.prisma.medication.create({
      data: {
        childId,
        name: this.crypto.encrypt(dto.name) as string,
        dose: this.crypto.encrypt(dto.dose),
        atcCode: dto.atcCode,
        route: dto.route,
        frequency: dto.frequency,
        durationDays: dto.durationDays,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
      },
    });
  }

  async setMedicationActive(user: AuthenticatedUser, childId: string, id: string, active: boolean) {
    await this.assertAccess(user, childId);
    await this.prisma.medication.updateMany({ where: { id, childId }, data: { active } });
    return { ok: true };
  }

  async addEpisode(user: AuthenticatedUser, childId: string, dto: EpisodeDto) {
    await this.assertAccess(user, childId);
    return this.prisma.episode.create({
      data: {
        childId,
        title: this.crypto.encrypt(dto.title) as string,
        summary: this.crypto.encrypt(dto.summary),
        icpc2Code: dto.icpc2Code,
        icd10Code: dto.icd10Code,
      },
    });
  }

  async closeEpisode(user: AuthenticatedUser, childId: string, id: string) {
    await this.assertAccess(user, childId);
    await this.prisma.episode.updateMany({
      where: { id, childId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
    return { ok: true };
  }
}

@ApiTags('health-records')
@ApiBearerAuth()
@Controller('health-records')
class HealthRecordsController {
  constructor(private readonly service: HealthRecordsService) {}

  @Get(':childId')
  @Roles(Role.PARENT, Role.PEDIATRICIAN)
  overview(@CurrentUser() user: AuthenticatedUser, @Param('childId') childId: string) {
    return this.service.overview(user, childId);
  }

  @Post(':childId/vitals')
  @Roles(Role.PARENT)
  vitals(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
    @Body() dto: VitalDto,
  ) {
    return this.service.addVital(user, childId, dto);
  }

  @Post(':childId/growth')
  @Roles(Role.PARENT)
  growth(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
    @Body() dto: GrowthDto,
  ) {
    return this.service.addGrowth(user, childId, dto);
  }

  @Post(':childId/vaccines')
  @Roles(Role.PARENT)
  vaccine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
    @Body() dto: VaccineDto,
  ) {
    return this.service.addVaccine(user, childId, dto);
  }

  @Post(':childId/medications')
  @Roles(Role.PARENT)
  medication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
    @Body() dto: MedicationDto,
  ) {
    return this.service.addMedication(user, childId, dto);
  }

  @Post(':childId/medications/:id/active')
  @Roles(Role.PARENT)
  setActive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
    @Param('id') id: string,
    @Body() dto: ActiveDto,
  ) {
    return this.service.setMedicationActive(user, childId, id, dto.active);
  }

  @Post(':childId/episodes')
  @Roles(Role.PARENT)
  episode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
    @Body() dto: EpisodeDto,
  ) {
    return this.service.addEpisode(user, childId, dto);
  }

  @Post(':childId/episodes/:id/close')
  @Roles(Role.PARENT)
  closeEpisode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
    @Param('id') id: string,
  ) {
    return this.service.closeEpisode(user, childId, id);
  }
}

@Module({
  controllers: [HealthRecordsController],
  providers: [HealthRecordsService],
  exports: [HealthRecordsService],
})
export class HealthRecordsModule {}
