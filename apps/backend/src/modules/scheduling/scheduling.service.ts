import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConsentSubject, ConsultationStatus, ServiceType } from '@prisma/client';
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
      throw new BadRequestException('endMinute must be after startMinute');
    }
    const ped = await this.prisma.pediatrician.findUniqueOrThrow({ where: { userId } });
    return this.prisma.availability.create({
      data: {
        pediatricianId: ped.id,
        weekday: dto.weekday,
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
        slotMinutes: dto.slotMinutes ?? 20,
      },
    });
  }

  async myAvailability(userId: string) {
    const ped = await this.prisma.pediatrician.findUniqueOrThrow({ where: { userId } });
    return this.prisma.availability.findMany({
      where: { pediatricianId: ped.id },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
    });
  }

  async deleteAvailability(userId: string, id: string) {
    const ped = await this.prisma.pediatrician.findUniqueOrThrow({ where: { userId } });
    const block = await this.prisma.availability.findUnique({ where: { id } });
    if (!block || block.pediatricianId !== ped.id) {
      throw new ForbiddenException('Not your availability block');
    }
    await this.prisma.availability.delete({ where: { id } });
    return { deleted: true };
  }

  /** Computes free slots for a pediatrician on a given UTC date. */
  async slots(pediatricianId: string, dateStr: string): Promise<string[]> {
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(dayStart.getTime())) throw new BadRequestException('Invalid date');
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    const weekday = dayStart.getUTCDay();

    const blocks = await this.prisma.availability.findMany({
      where: { pediatricianId, weekday },
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
    if (!child) throw new NotFoundException('Child not found');
    const member = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: child.familyId },
    });
    if (!member) throw new ForbiddenException('Not authorized for this child');
    if (!dto.teleconsultConsent) {
      throw new BadRequestException('Teleconsultation consent is required');
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
      throw new BadRequestException('scheduledAt must be a valid future time');
    }
    // The slot must still be free and inside the pediatrician's availability.
    // slots() already excludes times taken by an existing video session, so this
    // also prevents two families booking the same slot.
    const free = await this.slots(service.pediatricianId, scheduledAt.toISOString().slice(0, 10));
    if (!free.includes(scheduledAt.toISOString())) {
      throw new BadRequestException('Esse horário já não está disponível. Escolhe outro.');
    }

    const consultation = await this.prisma.consultation.create({
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

    await this.consent.record(userId, ConsentSubject.TELECONSULT, '2026-06-01', child.id, {
      consultationId: consultation.id,
    });

    const session = await this.prisma.videoSession.create({
      data: {
        consultationId: consultation.id,
        roomId: randomUUID(),
        scheduledAt,
      },
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
