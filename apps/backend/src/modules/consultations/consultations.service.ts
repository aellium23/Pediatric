import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConsultationStatus, Prisma, Role, ServiceType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { ConsentService } from '../../common/security/consent.service';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';
import { PaymentsService } from '../payments/payments.service';
import { AiService } from '../ai/ai.module';
import { StartConsultationDto, SendMessageDto } from './dto/consultations.dto';
import {
  ConsultationClosedEvent,
  ConsultationExpiredEvent,
  MessageCreatedEvent,
  PaymentCapturedEvent,
} from './events';

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
    private readonly consent: ConsentService,
    private readonly payments: PaymentsService,
    private readonly events: EventEmitter2,
    private readonly ai: AiService,
  ) {}

  /** Pediatrician-only: clean/structure a dictated note into SOAP via the AI
   *  assistant. Returns the structured text for review; does NOT save it. */
  async structureSummary(userId: string, consultationId: string, text: string) {
    const consultation = await this.assertParticipant(userId, consultationId);
    if (consultation.pediatrician.userId !== userId) {
      throw new ForbiddenException('Only the pediatrician can use the assistant');
    }
    const structured = await this.ai.structureClinicalNote(text);
    return { text: structured };
  }

  /** Parent starts a paid message consultation (consent-gated). */
  async start(userId: string, dto: StartConsultationDto) {
    const child = await this.prisma.child.findUnique({ where: { id: dto.childId } });
    if (!child) throw new NotFoundException('Child not found');
    const member = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: child.familyId },
    });
    if (!member) throw new ForbiddenException('Not authorized for this child');

    // Special-category data: require active health-data consent.
    await this.consent.assertHealthConsent(child.id);

    const service = await this.prisma.pediatricianService.findFirstOrThrow({
      where: { id: dto.serviceId, active: true },
    });
    const slaDueAt = new Date(Date.now() + service.slaHours * 3600 * 1000);

    const consultation = await this.prisma.consultation.create({
      data: {
        familyId: child.familyId,
        childId: child.id,
        pediatricianId: service.pediatricianId,
        type: service.type,
        status: ConsultationStatus.OPEN,
        priceCents: service.priceCents,
        currency: service.currency,
        scopeSnapshot: service.scopeText,
        slaDueAt,
        triage: dto.triage as Prisma.InputJsonValue | undefined,
        episodeId: dto.episodeId,
      },
    });

    if (dto.question) {
      await this.persistMessage(consultation.id, userId, dto.question);
    }
    return consultation;
  }

  /**
   * Pediatrician caseload as a patient chart: the children this pediatrician has
   * consulted, grouped by family (so siblings sit together), each with a
   * consultation count and the last-seen date. Powers the "Doentes" view.
   */
  async patientsForPediatrician(userId: string) {
    const ped = await this.prisma.pediatrician.findUniqueOrThrow({ where: { userId } });
    const consults = await this.prisma.consultation.findMany({
      where: { pediatricianId: ped.id },
      select: { childId: true, openedAt: true },
      orderBy: { openedAt: 'desc' },
    });
    const childIds = [...new Set(consults.map((c) => c.childId).filter(Boolean) as string[])];
    if (!childIds.length) return [];

    const children = await this.prisma.child.findMany({ where: { id: { in: childIds } } });
    const families = await this.prisma.family.findMany({
      where: { id: { in: [...new Set(children.map((c) => c.familyId))] } },
    });

    const stat = new Map<string, { count: number; last: Date | null }>();
    for (const c of consults) {
      if (!c.childId) continue;
      const s = stat.get(c.childId) ?? { count: 0, last: null };
      s.count += 1;
      if (!s.last || c.openedAt > s.last) s.last = c.openedAt;
      stat.set(c.childId, s);
    }

    type PatientChild = {
      id: string;
      name: string;
      birthDate: Date;
      sex: string | null;
      consultationCount: number;
      lastConsultAt: Date | null;
    };
    const byFamily = new Map<string, { id: string; name: string; children: PatientChild[] }>();
    for (const fam of families) {
      byFamily.set(fam.id, { id: fam.id, name: fam.name, children: [] });
    }
    for (const child of children) {
      const s = stat.get(child.id) ?? { count: 0, last: null };
      byFamily.get(child.familyId)?.children.push({
        id: child.id,
        name: child.name,
        birthDate: child.birthDate,
        sex: child.sex,
        consultationCount: s.count,
        lastConsultAt: s.last,
      });
    }
    return [...byFamily.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Longitudinal consultation history for one child. A pediatrician sees only
   * their own consultations with the child; a family member sees all of them.
   */
  async historyForChild(user: AuthenticatedUser, childId: string) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child not found');

    let where: Prisma.ConsultationWhereInput;
    if (user.role === Role.PEDIATRICIAN) {
      const ped = await this.prisma.pediatrician.findUnique({ where: { userId: user.userId } });
      const link = ped
        ? await this.prisma.consultation.findFirst({ where: { childId, pediatricianId: ped.id } })
        : null;
      if (!link) throw new ForbiddenException('No consultation with this child');
      where = { childId, pediatricianId: ped!.id };
    } else {
      const member = await this.prisma.familyMember.findFirst({
        where: { userId: user.userId, familyId: child.familyId },
      });
      if (!member) throw new ForbiddenException('Not authorized for this child');
      where = { childId };
    }

    const consultations = await this.prisma.consultation.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        priceCents: true,
        openedAt: true,
        answeredAt: true,
        closedAt: true,
        slaDueAt: true,
      },
    });
    return {
      child: { id: child.id, name: child.name, birthDate: child.birthDate, sex: child.sex },
      consultations,
    };
  }

  async listForParent(userId: string) {
    const memberships = await this.prisma.familyMember.findMany({ where: { userId } });
    return this.prisma.consultation.findMany({
      where: { familyId: { in: memberships.map((m) => m.familyId) } },
      orderBy: { openedAt: 'desc' },
      include: {
        child: { select: { id: true, name: true } },
        pediatrician: { select: { displayName: true, specialties: true } },
      },
    });
  }

  /** Admin/Finance: the most recent consultations across the platform. */
  async listAll() {
    return this.prisma.consultation.findMany({
      orderBy: { openedAt: 'desc' },
      take: 50,
    });
  }

  /** Pediatrician inbox, ordered by SLA urgency. */
  async listForPediatrician(userId: string) {
    const ped = await this.prisma.pediatrician.findUniqueOrThrow({ where: { userId } });
    return this.prisma.consultation.findMany({
      where: {
        pediatricianId: ped.id,
        status: { in: [ConsultationStatus.OPEN, ConsultationStatus.TRIAGE, ConsultationStatus.ANSWERED] },
      },
      orderBy: { slaDueAt: 'asc' },
      include: { child: { select: { id: true, name: true, birthDate: true } } },
    });
  }

  async getMessages(userId: string, consultationId: string) {
    await this.assertParticipant(userId, consultationId);
    const messages = await this.prisma.message.findMany({
      where: { consultationId },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((m) => ({
      id: m.id,
      senderUserId: m.senderUserId,
      body: this.crypto.decrypt(m.body),
      aiGenerated: m.aiGenerated,
      createdAt: m.createdAt,
    }));
  }

  /** Pediatrician writes/updates the post-consultation note (encrypted). */
  async setSummary(userId: string, consultationId: string, text: string) {
    const consultation = await this.assertParticipant(userId, consultationId);
    if (consultation.pediatrician.userId !== userId) {
      throw new ForbiddenException('Only the pediatrician can write the summary');
    }
    await this.prisma.consultation.update({
      where: { id: consultationId },
      data: { summary: this.crypto.encrypt(text) },
    });
    return { ok: true };
  }

  /** Either participant reads the decrypted post-consultation note. */
  async getSummary(userId: string, consultationId: string) {
    await this.assertParticipant(userId, consultationId);
    const c = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      select: { summary: true },
    });
    return { summary: this.crypto.decrypt(c?.summary ?? null) };
  }

  async sendMessage(userId: string, consultationId: string, dto: SendMessageDto) {
    const consultation = await this.assertParticipant(userId, consultationId);
    const message = await this.persistMessage(consultationId, userId, dto.body);

    // Pediatrician's first reply moves the consultation to ANSWERED (SLA met).
    const isPediatrician = consultation.pediatrician.userId === userId;
    const reopenable: ConsultationStatus[] = [
      ConsultationStatus.OPEN,
      ConsultationStatus.TRIAGE,
    ];
    if (isPediatrician && reopenable.includes(consultation.status)) {
      await this.prisma.consultation.update({
        where: { id: consultationId },
        data: { status: ConsultationStatus.ANSWERED, answeredAt: new Date() },
      });
    }
    return { id: message.id, createdAt: message.createdAt };
  }

  /** Pediatrician closes: capture payment, split, emit invoicing/notification events. */
  async close(userId: string, consultationId: string) {
    const consultation = await this.assertParticipant(userId, consultationId);
    if (consultation.pediatrician.userId !== userId) {
      throw new ForbiddenException('Only the pediatrician can close');
    }
    if (consultation.status === ConsultationStatus.CLOSED) return consultation;

    const split = await this.payments.captureAndSplit(consultationId);

    const updated = await this.prisma.consultation.update({
      where: { id: consultationId },
      data: { status: ConsultationStatus.CLOSED, closedAt: new Date() },
    });

    this.events.emit('consultation.closed', new ConsultationClosedEvent(consultationId));
    this.events.emit(
      'payment.captured',
      new PaymentCapturedEvent(consultationId, split.platformFeeCents, split.pediatricianAmount),
    );
    return updated;
  }

  /** Parent cancels an unanswered consultation (refunded). */
  async cancel(userId: string, consultationId: string) {
    const consultation = await this.assertParticipant(userId, consultationId);
    const inFamily = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: consultation.familyId },
    });
    if (!inFamily) throw new ForbiddenException('Only the family can cancel');
    const cancellable: ConsultationStatus[] = [
      ConsultationStatus.OPEN,
      ConsultationStatus.TRIAGE,
    ];
    if (!cancellable.includes(consultation.status)) {
      throw new BadRequestException('Consultation can no longer be cancelled');
    }
    await this.payments.refundForConsultation(consultationId, 'cancelled_by_parent');
    return this.prisma.consultation.update({
      where: { id: consultationId },
      data: { status: ConsultationStatus.REFUNDED },
    });
  }

  /** Admin/Finance refund (disputes, exceptions). */
  async refundByAdmin(consultationId: string, reason?: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });
    if (!consultation) throw new NotFoundException('Consultation not found');
    await this.payments.refundForConsultation(consultationId, reason ?? 'admin_refund');
    return this.prisma.consultation.update({
      where: { id: consultationId },
      data: { status: ConsultationStatus.REFUNDED },
    });
  }

  /** Called by the SLA scheduler: expire overdue consultations and auto-refund.
   *  Scheduled video consultations are excluded (no-show handled separately). */
  async expireOverdue(): Promise<number> {
    const overdue = await this.prisma.consultation.findMany({
      where: {
        status: { in: [ConsultationStatus.OPEN, ConsultationStatus.TRIAGE] },
        slaDueAt: { lt: new Date() },
        type: { notIn: [ServiceType.VIDEO] },
      },
    });
    for (const c of overdue) {
      await this.payments.refundForConsultation(c.id, 'sla_breached');
      await this.prisma.consultation.update({
        where: { id: c.id },
        data: { status: ConsultationStatus.EXPIRED },
      });
      this.events.emit('consultation.expired', new ConsultationExpiredEvent(c.id));
    }
    return overdue.length;
  }

  private async persistMessage(consultationId: string, userId: string, body: string) {
    const message = await this.prisma.message.create({
      data: { consultationId, senderUserId: userId, body: this.crypto.encrypt(body)! },
    });
    this.events.emit(
      'message.created',
      new MessageCreatedEvent(consultationId, message.id, userId),
    );
    return message;
  }

  /** Authorization: user is in the family OR is the assigned pediatrician. */
  private async assertParticipant(userId: string, consultationId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { pediatrician: true },
    });
    if (!consultation) throw new NotFoundException('Consultation not found');

    const inFamily = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: consultation.familyId },
    });
    if (!inFamily && consultation.pediatrician.userId !== userId) {
      throw new ForbiddenException('Not a participant in this consultation');
    }
    return consultation;
  }
}
