import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConsultationStatus, PediatricianStatus, Prisma, Role, ServiceType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { ConsentService } from '../../common/security/consent.service';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';
import { PaymentsService } from '../payments/payments.service';
import { AiService } from '../ai/ai.module';
import { StartConsultationDto, SendMessageDto } from './dto/consultations.dto';
import { computeExpectedReplyAt } from '../scheduling/expected-reply';
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
      throw new ForbiddenException('Apenas o pediatra pode usar o assistente.');
    }
    const structured = await this.ai.structureClinicalNote(text);
    return { text: structured };
  }

  /** Parent starts a paid message consultation (consent-gated). */
  async start(userId: string, dto: StartConsultationDto) {
    const child = await this.prisma.child.findUnique({ where: { id: dto.childId } });
    if (!child) throw new NotFoundException('Criança não encontrada.');
    const member = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: child.familyId },
    });
    if (!member) throw new ForbiddenException('Sem autorização para esta criança.');

    // Special-category data: require active health-data consent.
    await this.consent.assertHealthConsent(child.id);

    const service = await this.prisma.pediatricianService.findFirst({
      where: { id: dto.serviceId, active: true },
      include: { pediatrician: { select: { status: true } } },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado.');
    // Only verified (ACTIVE) pediatricians can take paid consultations — the
    // marketplace only lists them, but a direct serviceId must not bypass that.
    if (service.pediatrician.status !== PediatricianStatus.ACTIVE) {
      throw new BadRequestException('O pediatra não está disponível de momento.');
    }
    const slaDueAt = new Date(Date.now() + service.slaHours * 3600 * 1000);

    // Honest reply expectation for async consultations: targetHours counted
    // inside the pediatrician's MESSAGES windows, never beyond the refund
    // ceiling. Video is scheduled, so it has no reply expectation.
    let expectedReplyAt: Date | null = null;
    if (service.type !== ServiceType.VIDEO) {
      const windows = await this.prisma.availability.findMany({
        where: { pediatricianId: service.pediatricianId },
        select: { kind: true, weekday: true, startMinute: true, endMinute: true, date: true },
      });
      expectedReplyAt = computeExpectedReplyAt(windows, service.targetHours, new Date());
      if (!expectedReplyAt || expectedReplyAt > slaDueAt) expectedReplyAt = slaDueAt;
    }

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
        expectedReplyAt,
        // Triage answers are special-category health data — encrypted at rest
        // like message bodies and the clinical summary.
        triage: dto.triage
          ? (this.crypto.encrypt(JSON.stringify(dto.triage)) as Prisma.InputJsonValue)
          : undefined,
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
    const familyIds = [...new Set(children.map((c) => c.familyId))];
    const families = await this.prisma.family.findMany({ where: { id: { in: familyIds } } });

    // Guardians (the parents) per family, so the panel can show "Mãe / Pai".
    const members = await this.prisma.familyMember.findMany({
      where: { familyId: { in: familyIds } },
      include: { user: { select: { name: true, email: true } } },
    });
    const relOrder: Record<string, number> = { mother: 0, father: 1, guardian: 2 };
    const guardiansByFamily = new Map<string, { name: string; relationship: string }[]>();
    for (const mem of members) {
      const list = guardiansByFamily.get(mem.familyId) ?? [];
      list.push({
        name: mem.user.name ?? mem.user.email ?? 'Tutor',
        relationship: mem.relationship ?? 'guardian',
      });
      guardiansByFamily.set(mem.familyId, list);
    }
    for (const [k, v] of guardiansByFamily) {
      v.sort((a, b) => (relOrder[a.relationship] ?? 9) - (relOrder[b.relationship] ?? 9));
      guardiansByFamily.set(k, v);
    }

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
    type Guardian = { name: string; relationship: string };
    const byFamily = new Map<
      string,
      { id: string; name: string; guardians: Guardian[]; children: PatientChild[] }
    >();
    for (const fam of families) {
      byFamily.set(fam.id, {
        id: fam.id,
        name: fam.name,
        guardians: guardiansByFamily.get(fam.id) ?? [],
        children: [],
      });
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
    if (!child) throw new NotFoundException('Criança não encontrada.');

    let where: Prisma.ConsultationWhereInput;
    if (user.role === Role.PEDIATRICIAN) {
      const ped = await this.prisma.pediatrician.findUnique({ where: { userId: user.userId } });
      const link = ped
        ? await this.prisma.consultation.findFirst({ where: { childId, pediatricianId: ped.id } })
        : null;
      if (!link) throw new ForbiddenException('Não existe consulta com esta criança.');
      where = { childId, pediatricianId: ped!.id };
    } else {
      const member = await this.prisma.familyMember.findFirst({
        where: { userId: user.userId, familyId: child.familyId },
      });
      if (!member) throw new ForbiddenException('Sem autorização para esta criança.');
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
        expectedReplyAt: true,
      },
    });
    return {
      child: { id: child.id, name: child.name, birthDate: child.birthDate, sex: child.sex },
      consultations,
    };
  }

  /** Triage is stored AES-256-GCM (a string in the Json column). Decrypts for
   *  authorized readers; tolerates legacy plaintext objects and never throws
   *  on unreadable ciphertext (returns null instead of 500ing the list). */
  private revealTriage(triage: Prisma.JsonValue | null): Record<string, unknown> | null {
    if (triage == null) return null;
    if (typeof triage === 'string') {
      try {
        const dec = this.crypto.decryptSafe(triage);
        return dec ? (JSON.parse(dec) as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    }
    return triage as Record<string, unknown>;
  }

  async listForParent(userId: string) {
    const memberships = await this.prisma.familyMember.findMany({ where: { userId } });
    const rows = await this.prisma.consultation.findMany({
      where: { familyId: { in: memberships.map((m) => m.familyId) } },
      orderBy: { openedAt: 'desc' },
      include: {
        child: { select: { id: true, name: true } },
        pediatrician: { select: { displayName: true, specialties: true } },
      },
    });
    return rows.map((c) => ({ ...c, triage: this.revealTriage(c.triage) }));
  }

  /** Admin/Finance: the most recent consultations across the platform.
   *  Triage (clinical) is omitted — back-office roles don't need it. */
  async listAll(skip = 0, take = 50) {
    const rows = await this.prisma.consultation.findMany({
      orderBy: { openedAt: 'desc' },
      skip: Math.max(0, skip),
      take: Math.min(Math.max(take, 1), 100),
      include: {
        child: { select: { id: true, name: true } },
        pediatrician: { select: { displayName: true, specialties: true } },
      },
    });
    return rows.map(({ triage: _triage, ...c }) => c);
  }

  /** Pediatrician: recent consultations across every state — lets the
   *  clinician revisit closed/expired cases, not only the live inbox. */
  async recentForPediatrician(userId: string, take = 50) {
    const ped = await this.prisma.pediatrician.findUniqueOrThrow({ where: { userId } });
    const rows = await this.prisma.consultation.findMany({
      where: { pediatricianId: ped.id },
      orderBy: { openedAt: 'desc' },
      take: Math.min(Math.max(take, 1), 100),
      include: { child: { select: { id: true, name: true, birthDate: true } } },
    });
    return rows.map((c) => ({ ...c, triage: this.revealTriage(c.triage) }));
  }

  /** Pediatrician inbox, ordered by SLA urgency. */
  async listForPediatrician(userId: string) {
    const ped = await this.prisma.pediatrician.findUniqueOrThrow({ where: { userId } });
    const rows = await this.prisma.consultation.findMany({
      where: {
        pediatricianId: ped.id,
        status: { in: [ConsultationStatus.OPEN, ConsultationStatus.TRIAGE, ConsultationStatus.ANSWERED] },
      },
      orderBy: { slaDueAt: 'asc' },
      include: { child: { select: { id: true, name: true, birthDate: true } } },
    });
    return rows.map((c) => ({ ...c, triage: this.revealTriage(c.triage) }));
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
      body: this.crypto.decryptSafe(m.body),
      attachments: Array.isArray(m.attachments)
        ? (m.attachments as string[])
            .map((a) => this.crypto.decryptSafe(a))
            .filter((a): a is string => !!a)
        : undefined,
      aiGenerated: m.aiGenerated,
      createdAt: m.createdAt,
    }));
  }

  /** Pediatrician writes/updates the post-consultation note (encrypted). */
  async setSummary(userId: string, consultationId: string, text: string) {
    const consultation = await this.assertParticipant(userId, consultationId);
    if (consultation.pediatrician.userId !== userId) {
      throw new ForbiddenException('Apenas o pediatra pode escrever o resumo.');
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
    return { summary: this.crypto.decryptSafe(c?.summary ?? null) };
  }

  async sendMessage(userId: string, consultationId: string, dto: SendMessageDto) {
    const consultation = await this.assertParticipant(userId, consultationId);
    // Messaging only while the case is live — a settled/refunded/expired
    // consultation is read-only (and must not fire notifications).
    const writable: ConsultationStatus[] = [
      ConsultationStatus.OPEN,
      ConsultationStatus.TRIAGE,
      ConsultationStatus.ANSWERED,
    ];
    if (!writable.includes(consultation.status)) {
      throw new BadRequestException('Esta consulta está encerrada — já não recebe mensagens.');
    }
    const body = dto.body?.trim() ?? '';
    const attachments = dto.attachments ?? [];
    if (!body && !attachments.length) {
      throw new BadRequestException('A mensagem precisa de texto ou de uma foto.');
    }
    for (const a of attachments) {
      if (!a.startsWith('data:image/')) {
        throw new BadRequestException('Apenas fotos são suportadas de momento.');
      }
    }
    const message = await this.persistMessage(consultationId, userId, body, attachments);

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
      throw new ForbiddenException('Apenas o pediatra pode encerrar a consulta.');
    }
    if (consultation.status === ConsultationStatus.CLOSED) return consultation;
    // Only a live consultation can be closed — closing an EXPIRED/REFUNDED one
    // would re-capture an already-refunded payment and double-invoice.
    const closable: ConsultationStatus[] = [
      ConsultationStatus.OPEN,
      ConsultationStatus.TRIAGE,
      ConsultationStatus.ANSWERED,
    ];
    if (!closable.includes(consultation.status)) {
      throw new BadRequestException('A consulta já não pode ser encerrada.');
    }

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
    if (!inFamily) throw new ForbiddenException('Apenas a família pode cancelar.');
    const cancellable: ConsultationStatus[] = [
      ConsultationStatus.OPEN,
      ConsultationStatus.TRIAGE,
    ];
    if (!cancellable.includes(consultation.status)) {
      throw new BadRequestException('A consulta já não pode ser cancelada.');
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
    if (!consultation) throw new NotFoundException('Consulta não encontrada.');
    if (consultation.status === ConsultationStatus.REFUNDED) {
      throw new BadRequestException('Consulta já reembolsada.');
    }
    if (consultation.status === ConsultationStatus.EXPIRED) {
      throw new BadRequestException('Não é possível reembolsar uma consulta expirada.');
    }
    await this.payments.refundForConsultation(consultationId, reason ?? 'admin_refund');
    return this.prisma.consultation.update({
      where: { id: consultationId },
      data: { status: ConsultationStatus.REFUNDED },
    });
  }

  /** Called by the SLA scheduler: expire overdue consultations and auto-refund.
   *  Message consultations expire on SLA breach; scheduled video consultations
   *  expire as no-shows 24h after the scheduled time if the room never started. */
  async expireOverdue(): Promise<number> {
    const overdue = await this.prisma.consultation.findMany({
      where: {
        status: { in: [ConsultationStatus.OPEN, ConsultationStatus.TRIAGE] },
        slaDueAt: { lt: new Date() },
        type: { notIn: [ServiceType.VIDEO] },
      },
    });
    // Video no-shows: nobody ever joined the room and the slot is >24h past —
    // refund so the payment doesn't dangle in CREATED/AUTHORIZED forever.
    const noShowCutoff = new Date(Date.now() - 24 * 3600 * 1000);
    const noShows = await this.prisma.consultation.findMany({
      where: {
        status: { in: [ConsultationStatus.OPEN, ConsultationStatus.TRIAGE] },
        type: ServiceType.VIDEO,
        scheduledAt: { lt: noShowCutoff },
        videoSession: { startedAt: null },
      },
    });
    for (const c of [...overdue, ...noShows]) {
      const reason = c.type === ServiceType.VIDEO ? 'video_no_show' : 'sla_breached';
      await this.payments.refundForConsultation(c.id, reason);
      await this.prisma.consultation.update({
        where: { id: c.id },
        data: { status: ConsultationStatus.EXPIRED },
      });
      this.events.emit('consultation.expired', new ConsultationExpiredEvent(c.id));
    }
    return overdue.length + noShows.length;
  }

  private async persistMessage(
    consultationId: string,
    userId: string,
    body: string,
    attachments: string[] = [],
  ) {
    const message = await this.prisma.message.create({
      data: {
        consultationId,
        senderUserId: userId,
        body: this.crypto.encrypt(body)!,
        // Clinical photos are special-category health data — same encryption
        // at rest as bodies/triage/summary.
        attachments: attachments.length
          ? (attachments.map((a) => this.crypto.encrypt(a)!) as Prisma.InputJsonValue)
          : undefined,
      },
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
    if (!consultation) throw new NotFoundException('Consulta não encontrada.');

    const inFamily = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: consultation.familyId },
    });
    if (!inFamily && consultation.pediatrician.userId !== userId) {
      throw new ForbiddenException('Não és participante nesta consulta.');
    }
    return consultation;
  }
}
