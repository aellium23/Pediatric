import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import {
  AvailabilityKind,
  ConsentSubject,
  ConsultationStatus,
  Prisma,
  ServiceType,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConsentService } from '../../common/security/consent.service';
import { PaymentsService } from '../payments/payments.service';
import { ConsultationRebookOfferedEvent } from '../consultations/events';
import { SetAvailabilityDto, UpdateAvailabilityDto, BookVideoDto } from './dto/scheduling.dto';
import { localISODay, utcDayWindowLocal, wallClockToUTC } from './wall-clock';

/** A future booked consultation that an availability change would orphan. */
export type AffectedBooking = {
  consultationId: string;
  scheduledAt: Date;
  /** Child identified by initials only ("Tomás Mota" → "T.M.") — the impact
   *  dialog doesn't need the full name. */
  childInitials: string;
};

/** Wall-clock minute window (in the pediatrician's timezone). */
type MinuteWindow = { startMinute: number; endMinute: number };

function initialsOf(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}.`)
    .join('');
}

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger('Scheduling');

  constructor(
    private readonly prisma: PrismaService,
    private readonly consent: ConsentService,
    private readonly payments: PaymentsService,
    private readonly events: EventEmitter2,
  ) {}

  async setAvailability(userId: string, dto: SetAvailabilityDto) {
    if (dto.endMinute <= dto.startMinute) {
      throw new BadRequestException('O minuto final tem de ser posterior ao inicial.');
    }
    if (dto.weekday == null && !dto.date) {
      throw new BadRequestException('Indica um dia da semana ou uma data concreta.');
    }
    const ped = await this.prisma.pediatrician.findUniqueOrThrow({ where: { userId } });
    const common = {
      pediatricianId: ped.id,
      kind: (dto.kind ?? 'VIDEO') as AvailabilityKind,
      startMinute: dto.startMinute,
      endMinute: dto.endMinute,
      slotMinutes: dto.slotMinutes ?? 20,
    };
    if (!dto.date) {
      // Weekly template block (legacy behavior).
      return this.prisma.availability.create({ data: { ...common, weekday: dto.weekday! } });
    }
    const day = new Date(`${dto.date.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(day.getTime())) throw new BadRequestException('Data inválida.');
    const weeks = dto.repeatWeeks ?? 1;
    const rows = Array.from({ length: weeks }, (_, i) => {
      const date = new Date(day.getTime() + i * 7 * 24 * 3600 * 1000);
      return { ...common, date, weekday: date.getUTCDay() };
    });
    const created = await this.prisma.$transaction(
      rows.map((data) => this.prisma.availability.create({ data })),
    );
    return weeks === 1 ? created[0] : created;
  }

  async myAvailability(userId: string) {
    const ped = await this.prisma.pediatrician.findUniqueOrThrow({ where: { userId } });
    return this.prisma.availability.findMany({
      where: { pediatricianId: ped.id },
      orderBy: [{ date: 'asc' }, { weekday: 'asc' }, { startMinute: 'asc' }],
      take: 1000,
    });
  }

  /**
   * Future booked (OPEN/TRIAGE) video consultations whose scheduled instant
   * falls inside `block`'s wall-clock window — i.e. the bookings a delete or
   * edit of that block would orphan. When `newWindow` is given (an edit),
   * instants still covered by the new window are NOT affected.
   *
   * Windows are wall-clock minutes in the pediatrician's timezone, converted
   * per concrete date (so DST days are handled by wallClockToUTC). A dated
   * block governs only its own date; a recurring block governs every future
   * date on its weekday EXCEPT days that have dated blocks of the same kind —
   * those days are governed by their dated blocks, not the template.
   */
  async affectedBookings(
    pediatricianId: string,
    block: {
      kind: AvailabilityKind;
      weekday: number;
      startMinute: number;
      endMinute: number;
      date: Date | null;
    },
    newWindow?: MinuteWindow | null,
  ): Promise<AffectedBooking[]> {
    const ped = await this.prisma.pediatrician.findUnique({
      where: { id: pediatricianId },
      select: { timezone: true },
    });
    const tz = ped?.timezone ?? 'Europe/Lisbon';
    const sessions = await this.prisma.videoSession.findMany({
      where: {
        scheduledAt: { gte: new Date() },
        consultation: {
          pediatricianId,
          status: { in: [ConsultationStatus.OPEN, ConsultationStatus.TRIAGE] },
        },
      },
      select: {
        scheduledAt: true,
        consultation: { select: { id: true, child: { select: { name: true } } } },
      },
    });
    if (!sessions.length) return [];

    // Days already customized with dated blocks of this kind: the weekly
    // template does not govern them, so a recurring-block change never
    // affects bookings there.
    let datedDayKeys: Set<string> | null = null;
    if (!block.date) {
      const dated = await this.prisma.availability.findMany({
        where: { pediatricianId, kind: block.kind, date: { not: null } },
        select: { date: true },
      });
      datedDayKeys = new Set(dated.map((d) => d.date!.toISOString().slice(0, 10)));
    }
    const blockDay = block.date ? block.date.toISOString().slice(0, 10) : null;

    const affected: AffectedBooking[] = [];
    for (const s of sessions) {
      // The block's minutes are wall-clock, so the session's calendar day must
      // be computed in the pediatrician's timezone (not the UTC date).
      const day = localISODay(s.scheduledAt, tz);
      if (blockDay) {
        if (day !== blockDay) continue;
      } else {
        // A calendar day's weekday is a property of the date itself (no tz math).
        if (new Date(`${day}T00:00:00.000Z`).getUTCDay() !== block.weekday) continue;
        if (datedDayKeys!.has(day)) continue;
      }
      const inWindow = (w: MinuteWindow): boolean => {
        const start = wallClockToUTC(day, w.startMinute, tz);
        const end = wallClockToUTC(day, w.endMinute, tz);
        if (!start || !end) return false;
        const t = s.scheduledAt.getTime();
        return t >= start.getTime() && t < end.getTime();
      };
      if (!inWindow(block)) continue;
      if (newWindow && inWindow(newWindow)) continue; // still covered after the edit
      affected.push({
        consultationId: s.consultation.id,
        scheduledAt: s.scheduledAt,
        childInitials: initialsOf(s.consultation.child?.name),
      });
    }
    return affected;
  }

  /**
   * Gate + settle the booking impact of an availability change.
   *
   * Without `confirm`, any impact aborts with a 409 carrying the affected
   * list, so the UI can show exactly which consultations would be cancelled.
   * With `confirm`, each affected consultation is refunded
   * ('pediatrician_unavailable'), marked REFUNDED and a rebook event is
   * emitted for the family.
   *
   * NOT one big prisma.$transaction: refunds go through PaymentsService,
   * which calls Stripe and runs its own transaction — a service call cannot
   * join a Prisma transaction. This mirrors the codebase's existing pattern
   * (ConsultationsService.expireOverdue): sequential refund → status → event
   * per consultation. refundForConsultation is idempotent, so a partial
   * failure can be safely retried.
   */
  private async settleAffected(affected: AffectedBooking[], confirm: boolean): Promise<void> {
    if (!affected.length) return;
    if (!confirm) {
      throw new ConflictException({
        message: 'Esta alteração afeta consultas marcadas.',
        affected,
      });
    }
    for (const a of affected) {
      await this.payments.refundForConsultation(a.consultationId, 'pediatrician_unavailable');
      await this.prisma.consultation.update({
        where: { id: a.consultationId },
        data: { status: ConsultationStatus.REFUNDED },
      });
      this.events.emit(
        'consultation.rebook_offered',
        new ConsultationRebookOfferedEvent(a.consultationId),
      );
    }
  }

  async deleteAvailability(userId: string, id: string, confirm = false) {
    const ped = await this.prisma.pediatrician.findUniqueOrThrow({ where: { userId } });
    const block = await this.prisma.availability.findUnique({ where: { id } });
    if (!block || block.pediatricianId !== ped.id) {
      throw new ForbiddenException('Este bloco de disponibilidade não é teu.');
    }
    // Only VIDEO blocks can have bookings; MESSAGES blocks are freely removable.
    if (block.kind === AvailabilityKind.VIDEO) {
      const affected = await this.affectedBookings(block.pediatricianId, block);
      await this.settleAffected(affected, confirm);
    }
    await this.prisma.availability.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Edit = atomic delete+recreate with a prior booking-impact check (409 with
   * the affected list unless dto.confirm). See settleAffected for the
   * refund/rebook flow.
   */
  async updateAvailability(userId: string, id: string, dto: UpdateAvailabilityDto) {
    if (dto.endMinute <= dto.startMinute) {
      throw new BadRequestException('O minuto final tem de ser posterior ao inicial.');
    }
    const ped = await this.prisma.pediatrician.findUniqueOrThrow({ where: { userId } });
    const block = await this.prisma.availability.findUnique({ where: { id } });
    if (!block || block.pediatricianId !== ped.id) {
      throw new ForbiddenException('Este bloco de disponibilidade não é teu.');
    }
    const confirm = dto.confirm === true;
    const newKind = (dto.kind ?? block.kind) as AvailabilityKind;
    // Kind change VIDEO→MESSAGES removes the whole bookable window (null =
    // full impact); a VIDEO→VIDEO edit keeps whatever the new window covers.
    const newWindow: MinuteWindow | null =
      newKind === AvailabilityKind.VIDEO
        ? { startMinute: dto.startMinute, endMinute: dto.endMinute }
        : null;
    const checkImpact = block.kind === AvailabilityKind.VIDEO;

    // ── Dated block: replace it on its own date ──
    if (block.date) {
      if (checkImpact) {
        const affected = await this.affectedBookings(block.pediatricianId, block, newWindow);
        await this.settleAffected(affected, confirm);
      }
      const [, created] = await this.prisma.$transaction([
        this.prisma.availability.delete({ where: { id } }),
        this.prisma.availability.create({
          data: {
            pediatricianId: block.pediatricianId,
            kind: newKind,
            weekday: block.date.getUTCDay(),
            startMinute: dto.startMinute,
            endMinute: dto.endMinute,
            slotMinutes: block.slotMinutes,
            date: block.date,
          },
        }),
      ]);
      return created;
    }

    // ── Recurring block, scope 'day': materialize that single date ──
    if ((dto.scope ?? 'all') === 'day') {
      if (!dto.date) {
        throw new BadRequestException('Indica a data do dia a alterar.');
      }
      const dayISO = dto.date.slice(0, 10);
      const dayKey = new Date(`${dayISO}T00:00:00.000Z`);
      if (Number.isNaN(dayKey.getTime())) throw new BadRequestException('Data inválida.');
      if (dayKey.getUTCDay() !== block.weekday) {
        throw new BadRequestException('A data não cai no dia da semana deste bloco.');
      }
      // A day that already has dated blocks of this kind is no longer governed
      // by the template — edit those dated blocks directly instead.
      const alreadyDated = await this.prisma.availability.findFirst({
        where: { pediatricianId: block.pediatricianId, kind: block.kind, date: dayKey },
        select: { id: true },
      });
      if (alreadyDated) {
        throw new BadRequestException('Este dia já tem blocos específicos — edita-os diretamente.');
      }
      if (checkImpact) {
        // Impact only for that concrete date: old window minus new window.
        const affected = await this.affectedBookings(
          block.pediatricianId,
          { ...block, date: dayKey },
          newWindow,
        );
        await this.settleAffected(affected, confirm);
      }
      // The dated override replaces the WHOLE template for that day (per kind),
      // so copy every effective same-kind block for the weekday; only the
      // edited block's copy gets the new times/kind.
      const siblings = await this.prisma.availability.findMany({
        where: {
          pediatricianId: block.pediatricianId,
          kind: block.kind,
          weekday: block.weekday,
          date: null,
        },
      });
      const created = await this.prisma.$transaction(
        siblings.map((s) =>
          this.prisma.availability.create({
            data: {
              pediatricianId: block.pediatricianId,
              kind: s.id === block.id ? newKind : s.kind,
              weekday: block.weekday,
              startMinute: s.id === block.id ? dto.startMinute : s.startMinute,
              endMinute: s.id === block.id ? dto.endMinute : s.endMinute,
              slotMinutes: s.slotMinutes,
              date: dayKey,
            },
          }),
        ),
      );
      return created;
    }

    // ── Recurring block, scope 'all': replace the weekly template row ──
    if (checkImpact) {
      const affected = await this.affectedBookings(block.pediatricianId, block, newWindow);
      await this.settleAffected(affected, confirm);
    }
    const [, created] = await this.prisma.$transaction([
      this.prisma.availability.delete({ where: { id } }),
      this.prisma.availability.create({
        data: {
          pediatricianId: block.pediatricianId,
          kind: newKind,
          weekday: block.weekday,
          startMinute: dto.startMinute,
          endMinute: dto.endMinute,
          slotMinutes: block.slotMinutes,
          date: null,
        },
      }),
    ]);
    return created;
  }

  /**
   * Computes free slots for a pediatrician on a given CALENDAR day in the
   * pediatrician's own timezone. Availability minutes are wall-clock in that
   * timezone; the returned slots are UTC instants (ISO strings).
   */
  async slots(pediatricianId: string, dateStr: string): Promise<string[]> {
    // Midnight-UTC of the ISO day is still the storage key for dated blocks
    // (convention unchanged — Availability.date is a date-only key).
    const dayKey = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(dayKey.getTime())) throw new BadRequestException('Data inválida.');
    const ped = await this.prisma.pediatrician.findUnique({
      where: { id: pediatricianId },
      select: { timezone: true },
    });
    const tz = ped?.timezone ?? 'Europe/Lisbon';
    // Weekday of the LOCAL calendar day. Using the ISO date's UTC weekday is
    // exact here: a calendar day's weekday is a property of the date itself,
    // not of any timezone (2026-07-06 is a Monday in Lisbon, the Azores and
    // Luanda alike). No tz math needed.
    const weekday = dayKey.getUTCDay();

    // Only VIDEO blocks generate bookable slots. Dated blocks override the
    // weekly template for that day; the template only applies on days
    // without any dated block.
    const dated = await this.prisma.availability.findMany({
      where: { pediatricianId, kind: AvailabilityKind.VIDEO, date: dayKey },
    });
    const blocks = dated.length
      ? dated
      : await this.prisma.availability.findMany({
          where: { pediatricianId, kind: AvailabilityKind.VIDEO, weekday, date: null },
        });
    // Clash window = the UTC span of the LOCAL calendar day (local midnight to
    // next local midnight), since slot instants live inside that span.
    const { start: winStart, end: winEnd } = utcDayWindowLocal(dateStr, tz);
    const booked = await this.prisma.videoSession.findMany({
      where: {
        consultation: { pediatricianId },
        scheduledAt: { gte: winStart, lt: winEnd },
      },
      select: { scheduledAt: true },
    });
    const taken = new Set(booked.map((b) => b.scheduledAt.getTime()));
    const now = Date.now();

    const out: string[] = [];
    for (const b of blocks) {
      for (let m = b.startMinute; m + b.slotMinutes <= b.endMinute; m += b.slotMinutes) {
        const start = wallClockToUTC(dateStr, m, tz);
        if (start && start.getTime() > now && !taken.has(start.getTime())) {
          out.push(start.toISOString());
        }
      }
    }
    return out;
  }

  /**
   * Upcoming days (up to `days` ahead, capped) that have free slots, so the
   * parent can book without guessing dates. Returns only days with slots.
   */
  async nextSlots(
    pediatricianId: string,
    days = 10,
  ): Promise<{ date: string; slots: string[] }[]> {
    const span = Math.min(Math.max(days, 1), 21);
    const out: { date: string; slots: string[] }[] = [];
    const base = Date.now();
    for (let i = 0; i < span && out.length < 7; i++) {
      const day = new Date(base + i * 24 * 3600 * 1000);
      const dateStr = day.toISOString().slice(0, 10);
      const slots = await this.slots(pediatricianId, dateStr);
      if (slots.length) out.push({ date: dateStr, slots });
    }
    return out;
  }

  /** Books a video consultation: consent + consultation + video room + payment intent. */
  async book(userId: string, dto: BookVideoDto) {
    const child = await this.prisma.child.findUnique({ where: { id: dto.childId } });
    if (!child) throw new NotFoundException('Criança não encontrada.');
    const member = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: child.familyId },
    });
    if (!member) throw new ForbiddenException('Sem autorização para esta criança.');
    if (!dto.teleconsultConsent) {
      throw new BadRequestException('É necessário consentimento para a teleconsulta.');
    }
    // Health-data consent is normally recorded when the child is added. If it is
    // missing (e.g. a child created before that gate existed), the verified
    // guardian giving explicit consent here records it now — keeping an audited
    // consent on file before any clinical processing, rather than dead-ending.
    const healthConsent = await this.prisma.consent.findFirst({
      where: { childId: child.id, subject: ConsentSubject.HEALTH_DATA, revokedAt: null },
    });
    if (!healthConsent) {
      await this.consent.record(userId, ConsentSubject.HEALTH_DATA, '2026-06-01', child.id, {
        method: 'explicit',
        via: 'video-booking',
      });
    }

    const service = await this.prisma.pediatricianService.findFirstOrThrow({
      where: { id: dto.serviceId, active: true, type: ServiceType.VIDEO },
      include: { pediatrician: { select: { timezone: true } } },
    });
    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('A data/hora agendada tem de ser um momento futuro válido.');
    }
    // The slot must still be free and inside the pediatrician's availability.
    // slots() takes a calendar day in the PEDIATRICIAN's timezone, so derive
    // the local day of the instant (its UTC date can differ near midnight).
    const tz = service.pediatrician?.timezone ?? 'Europe/Lisbon';
    const free = await this.slots(service.pediatricianId, localISODay(scheduledAt, tz));
    if (!free.includes(scheduledAt.toISOString())) {
      throw new BadRequestException('Esse horário já não está disponível. Escolhe outro.');
    }

    // Re-check + create atomically (Serializable) so two families racing for
    // the same slot cannot both book it — the loser gets a friendly 400.
    let consultation: { id: string };
    let session: { roomId: string };
    try {
      ({ consultation, session } = await this.prisma.$transaction(
        async (tx) => {
          const clash = await tx.videoSession.findFirst({
            where: { consultation: { pediatricianId: service.pediatricianId }, scheduledAt },
            select: { id: true },
          });
          if (clash) {
            throw new BadRequestException('Esse horário já não está disponível. Escolhe outro.');
          }
          const created = await tx.consultation.create({
            data: {
              familyId: child.familyId,
              childId: child.id,
              pediatricianId: service.pediatricianId,
              type: ServiceType.VIDEO,
              status: ConsultationStatus.OPEN,
              priceCents: service.priceCents,
              currency: service.currency,
              scopeSnapshot: service.scopeText,
              scheduledAt,
              slaDueAt: scheduledAt,
            },
          });
          const vs = await tx.videoSession.create({
            data: { consultationId: created.id, roomId: randomUUID(), scheduledAt },
          });
          return { consultation: created, session: vs };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ));
    } catch (err) {
      // P2034: serialization conflict — the other booking won the race.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
        throw new BadRequestException('Esse horário acabou de ser reservado. Escolhe outro.');
      }
      throw err;
    }

    await this.consent.record(userId, ConsentSubject.TELECONSULT, '2026-06-01', child.id, {
      consultationId: consultation.id,
    });

    // Payment pre-auth is best-effort: the booking (consultation + video
    // session) is already persisted, so a payment hiccup (missing/invalid
    // Stripe key, PSP outage) must not fail the booking — it can be collected
    // or retried later.
    let clientSecret: string | null = null;
    try {
      const intent = await this.payments.createIntentForConsultation(userId, consultation.id);
      clientSecret = intent.clientSecret;
    } catch (err) {
      this.logger.warn(`Payment intent failed for ${consultation.id}: ${String(err)}`);
    }

    return { consultationId: consultation.id, roomId: session.roomId, clientSecret };
  }
}
