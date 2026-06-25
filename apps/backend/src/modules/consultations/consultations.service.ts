import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConsultationStatus, Prisma, ServiceType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { ConsentService } from '../../common/security/consent.service';
import { PaymentsService } from '../payments/payments.service';
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
  ) {}

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
      },
    });

    if (dto.question) {
      await this.persistMessage(consultation.id, userId, dto.question);
    }
    return consultation;
  }

  async listForParent(userId: string) {
    const memberships = await this.prisma.familyMember.findMany({ where: { userId } });
    return this.prisma.consultation.findMany({
      where: { familyId: { in: memberships.map((m) => m.familyId) } },
      orderBy: { openedAt: 'desc' },
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
