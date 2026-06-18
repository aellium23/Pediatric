import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { MessageCreatedEvent } from './events';

/**
 * Realtime chat for consultations. Auth via JWT in the handshake; clients join
 * a room per consultation only if they are a participant (Zero Trust).
 */
@WebSocketGateway({ namespace: '/realtime', cors: { origin: true } })
export class ConsultationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger('Realtime');
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string) ??
        client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) throw new UnauthorizedException();
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('jwt.accessSecret'),
      });
      client.data.userId = payload.sub;
      client.data.role = payload.role;
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('consultation:join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { consultationId: string },
  ): Promise<{ joined: boolean }> {
    await this.assertParticipant(client.data.userId, body.consultationId);
    await client.join(this.room(body.consultationId));
    return { joined: true };
  }

  /** Broadcasts a newly persisted message to the consultation room. */
  @OnEvent('message.created')
  async onMessageCreated(event: MessageCreatedEvent): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: event.messageId },
    });
    if (!message) return;
    this.server.to(this.room(event.consultationId)).emit('message:new', {
      id: message.id,
      consultationId: event.consultationId,
      senderUserId: message.senderUserId,
      body: this.crypto.decrypt(message.body),
      createdAt: message.createdAt,
    });
  }

  private room(consultationId: string): string {
    return `consultation:${consultationId}`;
  }

  private async assertParticipant(userId: string, consultationId: string): Promise<void> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { pediatrician: true },
    });
    if (!consultation) throw new WsException('Not found');
    const inFamily = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: consultation.familyId },
    });
    if (!inFamily && consultation.pediatrician.userId !== userId) {
      throw new WsException('Forbidden');
    }
  }
}
