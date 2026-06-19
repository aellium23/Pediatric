import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Logger,
  Module,
  Param,
  Post,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrentUser } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';
import {
  MessageCreatedEvent,
  ConsultationExpiredEvent,
  PaymentCapturedEvent,
} from '../consultations/events';

// ── Port (hexagonal): push provider (FCM/APNs) ──
export abstract class NotificationPort {
  abstract push(userId: string, title: string, body: string): Promise<void>;
}
export const NOTIFICATION_PORT = Symbol('NOTIFICATION_PORT');

@Injectable()
class FcmApnsAdapter extends NotificationPort {
  private readonly logger = new Logger('Push');
  async push(userId: string, title: string): Promise<void> {
    // Real FCM/APNs delivery lands when credentials are provisioned.
    this.logger.debug(`push -> ${userId}: ${title}`);
  }
}

class RegisterDeviceDto {
  @ApiProperty({ enum: ['ios', 'android', 'web'] })
  @IsIn(['ios', 'android', 'web'])
  platform!: string;

  @ApiProperty() @IsString() token!: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_PORT) private readonly push: NotificationPort,
  ) {}

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    return { read: true };
  }

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    await this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      create: { userId, platform: dto.platform, token: dto.token },
      update: { userId, platform: dto.platform },
    });
    return { registered: true };
  }

  private async notify(userId: string, type: string, title: string, body: string) {
    await this.prisma.notification.create({ data: { userId, type, title, body } });
    await this.push.push(userId, title, body);
  }

  // ── Event-driven notifications ──
  @OnEvent('message.created')
  async onMessage(event: MessageCreatedEvent): Promise<void> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: event.consultationId },
      include: { pediatrician: true },
    });
    if (!consultation) return;
    const members = await this.prisma.familyMember.findMany({
      where: { familyId: consultation.familyId },
    });
    const recipients = new Set<string>([
      consultation.pediatrician.userId,
      ...members.map((m) => m.userId),
    ]);
    recipients.delete(event.senderUserId);
    for (const userId of recipients) {
      await this.notify(userId, 'message', 'Nova mensagem', 'Tens uma nova mensagem numa consulta.');
    }
  }

  @OnEvent('payment.captured')
  async onCaptured(event: PaymentCapturedEvent): Promise<void> {
    const primaryUserId = await this.primaryUser(event.consultationId);
    if (!primaryUserId) return;
    await this.notify(
      primaryUserId,
      'invoice',
      'Consulta concluída',
      'A consulta foi encerrada e a fatura emitida.',
    );
  }

  @OnEvent('consultation.expired')
  async onExpired(event: ConsultationExpiredEvent): Promise<void> {
    const primaryUserId = await this.primaryUser(event.consultationId);
    if (!primaryUserId) return;
    await this.notify(
      primaryUserId,
      'refund',
      'Reembolso efetuado',
      'O pediatra não respondeu dentro do prazo. O valor foi reembolsado.',
    );
  }

  private async primaryUser(consultationId: string): Promise<string | null> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });
    if (!consultation) return null;
    const family = await this.prisma.family.findUnique({
      where: { id: consultation.familyId },
    });
    return family?.primaryUserId ?? null;
  }
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user.userId);
  }

  @Post(':id/read')
  read(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.markRead(user.userId, id);
  }

  @Post('devices')
  registerDevice(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterDeviceDto) {
    return this.service.registerDevice(user.userId, dto);
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: NOTIFICATION_PORT, useClass: FcmApnsAdapter },
  ],
})
export class NotificationsModule {}
