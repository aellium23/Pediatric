import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConsultationStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { StartConsultationDto, SendMessageDto } from './dto/consultations.dto';

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
  ) {}

  /** Parent starts a paid message consultation (payment is created in PaymentsModule, Increment 2). */
  async start(userId: string, dto: StartConsultationDto) {
    const child = await this.prisma.child.findUnique({ where: { id: dto.childId } });
    if (!child) throw new NotFoundException('Child not found');
    const member = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: child.familyId },
    });
    if (!member) throw new ForbiddenException('Not authorized for this child');

    const service = await this.prisma.pediatricianService.findFirstOrThrow({
      where: { id: dto.serviceId, active: true },
      include: { pediatrician: true },
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
        triage: dto.triage ?? undefined,
      },
    });

    if (dto.question) {
      await this.prisma.message.create({
        data: {
          consultationId: consultation.id,
          senderUserId: userId,
          body: this.crypto.encrypt(dto.question)!,
        },
      });
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
    await this.assertParticipant(userId, consultationId);
    const message = await this.prisma.message.create({
      data: {
        consultationId,
        senderUserId: userId,
        body: this.crypto.encrypt(dto.body)!,
      },
    });
    return { id: message.id, createdAt: message.createdAt };
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
    const isPediatrician = consultation.pediatrician.userId === userId;
    if (!inFamily && !isPediatrician) {
      throw new ForbiddenException('Not a participant in this consultation');
    }
    return consultation;
  }
}
