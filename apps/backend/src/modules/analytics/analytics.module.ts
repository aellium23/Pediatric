import { Body, Controller, Get, Injectable, Logger, Module, Post, Query } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from 'throttler';
import { Role } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrentUser, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';
import {
  ConsultationClosedEvent,
  ConsultationExpiredEvent,
  ConsultationRatedEvent,
  ConsultationStartedEvent,
  MessageCreatedEvent,
} from '../consultations/events';

/**
 * The closed set of event names. A fixed list (rather than free text from the
 * client) is what keeps this table free of clinical content and keeps the
 * funnel readable — an unknown name is dropped, not stored.
 */
export const FUNNEL_EVENTS = [
  'search',
  'open_profile',
  'triage_start',
  'message_sent',
  'video_booked',
  'answered',
  'closed',
  'rated',
  'refund_auto',
] as const;

/**
 * Habit events. These are the ones that answer the question the pilot actually
 * has to answer — do parents come back when nobody is ill? — and none of them
 * involve a consultation.
 */
export const HABIT_EVENTS = [
  'app_open',
  'record_view',
  'growth_add',
  'article_read',
] as const;

/** Events a client may report. Server-owned outcomes are not in this list. */
export const CLIENT_EVENTS = [
  'search',
  'open_profile',
  ...HABIT_EVENTS,
] as const;

export type EventName = (typeof FUNNEL_EVENTS)[number] | (typeof HABIT_EVENTS)[number];

class TrackEventDto {
  @ApiProperty({ enum: CLIENT_EVENTS })
  @IsIn(CLIENT_EVENTS as unknown as string[])
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pediatricianId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiProperty({ required: false, description: 'Small integer only — never free text.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  value?: number;
}

class TrackBatchDto {
  @ApiProperty({ type: [TrackEventDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TrackEventDto)
  events!: TrackEventDto[];
}

export interface FunnelRow {
  name: string;
  count: number;
}

export interface HabitWeek {
  /** ISO date of the Monday that starts the week. */
  weekStart: string;
  activeParents: number;
  /** Events that are not part of a consultation — the habit signal. */
  nonConsultActions: number;
  sessions: number;
}

export interface AnalyticsSummary {
  from: string;
  funnel: FunnelRow[];
  habit: HabitWeek[];
  /** Parents with ≥1 app_open in ≥2 distinct weeks — the repeat-visit signal. */
  returningParents: number;
  totalEvents: number;
}

/** Monday 00:00 UTC of the week containing `d`. */
function weekStart(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // getUTCDay: 0 = Sunday. Shift so Monday is the first day.
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger('Analytics');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Never let instrumentation break the thing it is measuring: every write is
   * fire-and-forget and swallows its own errors. A lost event is a worse
   * metric; a thrown event is a broken consultation.
   */
  track(event: {
    name: EventName;
    role?: Role | null;
    userId?: string | null;
    consultationId?: string | null;
    pediatricianId?: string | null;
    specialty?: string | null;
    value?: number | null;
  }): void {
    this.prisma.analyticsEvent
      .create({
        data: {
          name: event.name,
          role: event.role ?? undefined,
          userId: event.userId ?? undefined,
          consultationId: event.consultationId ?? undefined,
          pediatricianId: event.pediatricianId ?? undefined,
          specialty: event.specialty ?? undefined,
          value: event.value ?? undefined,
        },
      })
      .catch((e) => this.logger.warn(`dropped ${event.name}: ${String(e)}`));
  }

  /** Client-reported events; the DTO already restricted the names. */
  async ingest(user: AuthenticatedUser, dto: TrackBatchDto): Promise<{ accepted: number }> {
    for (const e of dto.events) {
      this.track({
        name: e.name as EventName,
        role: user.role,
        userId: user.userId,
        pediatricianId: e.pediatricianId,
        specialty: e.specialty,
        value: e.value,
      });
    }
    return { accepted: dto.events.length };
  }

  // ── Server-owned outcomes ──
  // Listening rather than being called keeps analytics out of the clinical call
  // chain entirely: these handlers cannot fail a close, a reply or a refund.

  @OnEvent('consultation.started')
  onStarted(e: ConsultationStartedEvent): void {
    this.track({
      name: e.type === 'VIDEO' ? 'video_booked' : 'triage_start',
      role: Role.PARENT,
      userId: e.userId,
      consultationId: e.consultationId,
      pediatricianId: e.pediatricianId,
      specialty: e.specialty,
      value: e.priceCents,
    });
  }

  @OnEvent('message.created')
  onMessage(e: MessageCreatedEvent): void {
    this.track({
      name: 'message_sent',
      userId: e.senderUserId,
      consultationId: e.consultationId,
    });
  }

  @OnEvent('consultation.answered')
  onAnswered(e: { consultationId: string; pediatricianId?: string }): void {
    this.track({
      name: 'answered',
      role: Role.PEDIATRICIAN,
      consultationId: e.consultationId,
      pediatricianId: e.pediatricianId,
    });
  }

  @OnEvent('consultation.closed')
  onClosed(e: ConsultationClosedEvent): void {
    this.track({ name: 'closed', role: Role.PEDIATRICIAN, consultationId: e.consultationId });
  }

  @OnEvent('consultation.expired')
  onExpired(e: ConsultationExpiredEvent): void {
    this.track({ name: 'refund_auto', consultationId: e.consultationId });
  }

  @OnEvent('consultation.rated')
  onRated(e: ConsultationRatedEvent): void {
    this.track({
      name: 'rated',
      role: Role.PARENT,
      userId: e.userId,
      consultationId: e.consultationId,
      pediatricianId: e.pediatricianId,
      value: e.rating,
    });
  }

  // ── Reading ──

  async summary(days = 42): Promise<AnalyticsSummary> {
    const from = new Date(Date.now() - days * 86_400_000);
    const rows = await this.prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: from } },
      select: { name: true, userId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const funnelCounts = new Map<string, number>();
    for (const n of FUNNEL_EVENTS) funnelCounts.set(n, 0);

    const weeks = new Map<string, { parents: Set<string>; actions: number; sessions: number }>();
    const parentWeeks = new Map<string, Set<string>>();
    const habitNames = new Set<string>(HABIT_EVENTS);

    for (const r of rows) {
      if (funnelCounts.has(r.name)) funnelCounts.set(r.name, funnelCounts.get(r.name)! + 1);

      const wk = weekStart(r.createdAt).toISOString().slice(0, 10);
      const bucket = weeks.get(wk) ?? { parents: new Set<string>(), actions: 0, sessions: 0 };
      if (habitNames.has(r.name)) bucket.actions += 1;
      if (r.name === 'app_open') {
        bucket.sessions += 1;
        if (r.userId) {
          bucket.parents.add(r.userId);
          const seen = parentWeeks.get(r.userId) ?? new Set<string>();
          seen.add(wk);
          parentWeeks.set(r.userId, seen);
        }
      }
      weeks.set(wk, bucket);
    }

    let returningParents = 0;
    for (const seen of parentWeeks.values()) if (seen.size >= 2) returningParents += 1;

    return {
      from: from.toISOString(),
      funnel: FUNNEL_EVENTS.map((name) => ({ name, count: funnelCounts.get(name) ?? 0 })),
      habit: [...weeks.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([weekStartIso, b]) => ({
          weekStart: weekStartIso,
          activeParents: b.parents.size,
          nonConsultActions: b.actions,
          sessions: b.sessions,
        })),
      returningParents,
      totalEvents: rows.length,
    };
  }

  async list(skip = 0, take = 50) {
    const [items, total] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(take, 200),
      }),
      this.prisma.analyticsEvent.count(),
    ]);
    return { items, total };
  }

  /** CSV so the founder can pull the pilot's numbers into a sheet. */
  async csv(days = 90): Promise<string> {
    const from = new Date(Date.now() - days * 86_400_000);
    const rows = await this.prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: from } },
      orderBy: { createdAt: 'asc' },
    });
    const header = 'createdAt,name,role,userId,consultationId,pediatricianId,specialty,value';
    const body = rows.map((r) =>
      [
        r.createdAt.toISOString(),
        r.name,
        r.role ?? '',
        r.userId ?? '',
        r.consultationId ?? '',
        r.pediatricianId ?? '',
        r.specialty ?? '',
        r.value ?? '',
      ].join(','),
    );
    return [header, ...body].join('\n');
  }
}

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  /** Any signed-in client may report its own events. Batched, so the limit is
   *  per flush and not per event. */
  @Post('events')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  track(@CurrentUser() user: AuthenticatedUser, @Body() dto: TrackBatchDto) {
    return this.service.ingest(user, dto);
  }

  @Get('summary')
  @Roles(Role.PLATFORM_ADMIN)
  summary(@Query('days') days?: string) {
    return this.service.summary(days ? Number(days) : 42);
  }

  @Get('events')
  @Roles(Role.PLATFORM_ADMIN)
  list(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.service.list(skip ? Number(skip) : 0, take ? Number(take) : 50);
  }

  @Get('export')
  @Roles(Role.PLATFORM_ADMIN)
  async export(@Query('days') days?: string) {
    return { csv: await this.service.csv(days ? Number(days) : 90) };
  }
}

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
