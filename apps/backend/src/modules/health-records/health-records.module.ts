import {
  Body,
  Controller,
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
import { ChildAccessService } from '../../common/security/child-access.service';
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
class AllergyDto {
  @ApiProperty() @IsString() @MaxLength(200) label!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(40) code?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(20) category?: string;
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
    private readonly access: ChildAccessService,
  ) {}

  /** Parent must own the child; pediatrician must share a consultation with them.
   *  The rule itself lives in ChildAccessService so the document vault enforces
   *  exactly the same one. Returns the child (birthDate/sex feed the WHO curves). */
  private assertAccess(user: AuthenticatedUser, childId: string) {
    return this.access.assertAccess(user, childId);
  }

  async overview(user: AuthenticatedUser, childId: string) {
    const child = await this.assertAccess(user, childId);
    const [growth, vaccines, medications, episodes, vitals, allergies] = await Promise.all([
      this.prisma.growthMeasurement.findMany({ where: { childId }, orderBy: { measuredAt: 'asc' } }),
      this.prisma.vaccination.findMany({ where: { childId }, orderBy: { date: 'desc' } }),
      this.prisma.medication.findMany({ where: { childId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.episode.findMany({ where: { childId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.vital.findMany({ where: { childId }, orderBy: { measuredAt: 'desc' }, take: 50 }),
      this.prisma.allergy.findMany({ where: { childId }, orderBy: { createdAt: 'desc' } }),
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
        name: this.crypto.decryptSafe(v.name),
        date: v.date,
        notes: this.crypto.decryptSafe(v.notes),
        pnvAbbr: v.pnvAbbr,
        cvx: v.cvx,
      })),
      medications: medications.map((m) => ({
        id: m.id,
        name: this.crypto.decryptSafe(m.name),
        dose: this.crypto.decryptSafe(m.dose),
        atcCode: m.atcCode,
        route: m.route,
        frequency: m.frequency,
        durationDays: m.durationDays,
        active: m.active,
        startedAt: m.startedAt,
      })),
      episodes: episodes.map((e) => ({
        id: e.id,
        title: this.crypto.decryptSafe(e.title),
        summary: this.crypto.decryptSafe(e.summary),
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
      allergies: allergies.map((a) => ({
        id: a.id,
        label: this.crypto.decryptSafe(a.label),
        code: a.code,
        category: a.category,
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

  /**
   * Child timeline: every clinically relevant event in one chronological view
   * (consultations, vaccines, growth, episodes opened/closed, medication
   * starts, allergies). The heart of the "one record per child" experience.
   */
  async timeline(user: AuthenticatedUser, childId: string) {
    const child = await this.assertAccess(user, childId);
    const [consults, growth, vaccines, medications, episodes, allergies] = await Promise.all([
      this.prisma.consultation.findMany({
        where: { childId },
        orderBy: { openedAt: 'desc' },
        take: 200,
        select: {
          id: true,
          type: true,
          status: true,
          openedAt: true,
          closedAt: true,
          pediatrician: { select: { displayName: true } },
        },
      }),
      this.prisma.growthMeasurement.findMany({
        where: { childId },
        orderBy: { measuredAt: 'desc' },
        take: 200,
      }),
      this.prisma.vaccination.findMany({ where: { childId }, orderBy: { date: 'desc' }, take: 200 }),
      this.prisma.medication.findMany({
        where: { childId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.episode.findMany({ where: { childId }, orderBy: { createdAt: 'desc' }, take: 200 }),
      this.prisma.allergy.findMany({ where: { childId }, orderBy: { createdAt: 'desc' }, take: 200 }),
    ]);

    type TimelineEvent = {
      at: Date;
      kind: 'consultation' | 'vaccine' | 'growth' | 'episode' | 'medication' | 'allergy';
      title: string;
      detail: string | null;
      refId: string;
    };
    const events: TimelineEvent[] = [];

    for (const c of consults) {
      const who = c.pediatrician?.displayName ? ` · ${c.pediatrician.displayName}` : '';
      events.push({
        at: c.openedAt,
        kind: 'consultation',
        title: c.type === 'VIDEO' ? 'Videoconsulta' : 'Consulta por mensagem',
        detail: `${c.status}${who}`,
        refId: c.id,
      });
    }
    for (const g of growth) {
      const parts = [
        g.heightCm ? `${g.heightCm} cm` : null,
        g.weightKg ? `${g.weightKg} kg` : null,
        g.headCm ? `PC ${g.headCm} cm` : null,
      ].filter(Boolean);
      events.push({
        at: g.measuredAt,
        kind: 'growth',
        title: 'Medição de crescimento',
        detail: parts.join(' · ') || null,
        refId: g.id,
      });
    }
    for (const v of vaccines) {
      events.push({
        at: v.date,
        kind: 'vaccine',
        title: this.crypto.decryptSafe(v.name) ?? 'Vacina',
        detail: v.pnvAbbr ? `PNV · ${v.pnvAbbr}` : null,
        refId: v.id,
      });
    }
    for (const m of medications) {
      const name = this.crypto.decryptSafe(m.name) ?? 'Medicamento';
      const dose = this.crypto.decryptSafe(m.dose);
      events.push({
        at: m.startedAt ?? m.createdAt,
        kind: 'medication',
        title: `Medicação: ${name}`,
        detail: [dose, m.frequency].filter(Boolean).join(' · ') || null,
        refId: m.id,
      });
    }
    for (const e of episodes) {
      const title = this.crypto.decryptSafe(e.title) ?? 'Episódio clínico';
      events.push({
        at: e.createdAt,
        kind: 'episode',
        title: `Episódio: ${title}`,
        detail: e.icpc2Code ? `ICPC-2 ${e.icpc2Code}` : null,
        refId: e.id,
      });
      if (e.closedAt) {
        events.push({
          at: e.closedAt,
          kind: 'episode',
          title: `Episódio resolvido: ${title}`,
          detail: null,
          refId: e.id,
        });
      }
    }
    for (const a of allergies) {
      events.push({
        at: a.createdAt,
        kind: 'allergy',
        title: `Alergia registada: ${this.crypto.decryptSafe(a.label) ?? '—'}`,
        detail: a.category ?? null,
        refId: a.id,
      });
    }

    events.sort((a, b) => b.at.getTime() - a.at.getTime());
    return {
      child: {
        id: child.id,
        name: child.name,
        birthDate: child.birthDate,
        sex: child.sex,
        // Boletim detail only: decrypted here for parents and pediatricians
        // with clinical access (assertAccess above); list endpoints never
        // decrypt or expose it.
        snsNumber: this.crypto.decryptSafe(child.snsNumber),
      },
      events: events.slice(0, 300),
    };
  }

  async addAllergy(user: AuthenticatedUser, childId: string, dto: AllergyDto) {
    await this.assertAccess(user, childId);
    return this.prisma.allergy.create({
      data: {
        childId,
        label: this.crypto.encrypt(dto.label) as string,
        code: dto.code,
        category: dto.category,
      },
    });
  }

  async removeAllergy(user: AuthenticatedUser, childId: string, id: string) {
    await this.assertAccess(user, childId);
    await this.prisma.allergy.deleteMany({ where: { id, childId } });
    return { ok: true };
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

  @Get(':childId/timeline')
  @Roles(Role.PARENT, Role.PEDIATRICIAN)
  timeline(@CurrentUser() user: AuthenticatedUser, @Param('childId') childId: string) {
    return this.service.timeline(user, childId);
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

  @Post(':childId/allergies')
  @Roles(Role.PARENT)
  addAllergy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
    @Body() dto: AllergyDto,
  ) {
    return this.service.addAllergy(user, childId, dto);
  }

  @Post(':childId/allergies/:id/remove')
  @Roles(Role.PARENT)
  removeAllergy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
    @Param('id') id: string,
  ) {
    return this.service.removeAllergy(user, childId, id);
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
