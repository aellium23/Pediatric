import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConsentSubject, ConsultationStatus, Prisma, ServiceType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConsentService } from '../../common/security/consent.service';
import { PaymentsService } from '../payments/payments.service';
import { SetAvailabilityDto, BookVideoDto } from './dto/scheduling.dto';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger('Scheduling');

  constructor(
    private readonly prisma: PrismaService,
    private readonly consent: ConsentService,
    private readonly payments: PaymentsService,
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

  async deleteAvailability(userId: string, id: string) {
    const ped = await this.prisma.pediatrician.findUniqueOrThrow({ where: { userId } });
    const block = await this.prisma.availability.findUnique({ where: { id } });
    if (!block || block.pediatricianId !== ped.id) {
      throw new ForbiddenException('Este bloco de disponibilidade não é teu.');
    }
    await this.prisma.availability.delete({ where: { id } });
    return { deleted: true };
  }

  /** Computes free slots for a pediatrician on a given UTC date. */
  async slots(pediatricianId: string, dateStr: string): Promise<string[]> {
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(dayStart.getTime())) throw new BadRequestException('Data inválida.');
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    const weekday = dayStart.getUTCDay();

    // Dated blocks override the weekly template for that day; the template
    // only applies on days without any dated block.
    const dated = await this.prisma.availability.findMany({
      where: { pediatricianId, date: dayStart },
    });
    const blocks = dated.length
      ? dated
      : await this.prisma.availability.findMany({
          where: { pediatricianId, weekday, date: null },
        });
    const booked = await this.prisma.videoSession.findMany({
      where: {
        consultation: { pediatricianId },
        scheduledAt: { gte: dayStart, lt: dayEnd },
      },
      select: { scheduledAt: true },
    });
    const taken = new Set(booked.map((b) => b.scheduledAt.getTime()));
    const now = Date.now();

    const out: string[] = [];
    for (const b of blocks) {
      for (let m = b.startMinute; m + b.slotMinutes <= b.endMinute; m += b.slotMinutes) {
        const start = new Date(dayStart.getTime() + m * 60 * 1000);
        if (start.getTime() > now && !taken.has(start.getTime())) {
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
    });
    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('A data/hora agendada tem de ser um momento futuro válido.');
    }
    // The slot must still be free and inside the pediatrician's availability.
    const free = await this.slots(service.pediatricianId, scheduledAt.toISOString().slice(0, 10));
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
