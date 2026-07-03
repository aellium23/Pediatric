import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrentUser, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';

// ── Port (hexagonal) ──
export interface VideoAccess {
  token: string;
  url: string;
  roomId: string;
}
export abstract class VideoPort {
  abstract issueAccessToken(roomId: string, identity: string, canPublish: boolean): VideoAccess;
}
export const VIDEO_PORT = Symbol('VIDEO_PORT');

/**
 * LiveKit adapter (EU self-host). When LIVEKIT_API_KEY + LIVEKIT_API_SECRET are
 * provisioned it issues a real, standards-compliant LiveKit access token (HS256
 * JWT with a video grant) — accepted by any LiveKit server/SDK. Without
 * credentials it falls back to a signed demo grant so the flow still works.
 */
@Injectable()
export class LiveKitAdapter extends VideoPort {
  // Sign the LiveKit access token with the vetted JWT library (HS256). The
  // secret is a JWT signing key, not a stored password — HS256/HMAC-SHA256 is
  // the algorithm LiveKit requires (the app itself is passwordless).
  private readonly jwt = new JwtService();

  issueAccessToken(roomId: string, identity: string, canPublish: boolean): VideoAccess {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL ?? 'wss://video.pedia.local';
    const hasCreds = Boolean(apiKey && apiSecret);

    // Real LiveKit token when credentials are provisioned; a dev-signed token
    // otherwise so the demo flow still works (never reaches a real LiveKit).
    const token = this.jwt.sign(
      { video: { room: roomId, roomJoin: true, canPublish, canSubscribe: true } },
      {
        secret: hasCreds ? (apiSecret as string) : 'dev-livekit-secret',
        algorithm: 'HS256',
        issuer: hasCreds ? (apiKey as string) : 'demo',
        subject: identity,
        expiresIn: 3600,
        notBefore: 0,
        jwtid: randomUUID(),
      },
    );
    return { token, url, roomId };
  }
}

@Injectable()
export class VideoService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(VIDEO_PORT) private readonly video: VideoPort,
  ) {}

  /** Issues a room token to a verified participant of the consultation. */
  async getToken(user: AuthenticatedUser, consultationId: string): Promise<VideoAccess> {
    const session = await this.prisma.videoSession.findUnique({
      where: { consultationId },
      include: { consultation: { include: { pediatrician: true } } },
    });
    if (!session) throw new NotFoundException('Sessão de vídeo não encontrada.');

    const inFamily = await this.prisma.familyMember.findFirst({
      where: { userId: user.userId, familyId: session.consultation.familyId },
    });
    const isPediatrician = session.consultation.pediatrician.userId === user.userId;
    if (!inFamily && !isPediatrician) {
      throw new ForbiddenException('Não és participante nesta consulta.');
    }

    if (!session.startedAt) {
      await this.prisma.videoSession.update({
        where: { id: session.id },
        data: { startedAt: new Date() },
      });
    }
    return this.video.issueAccessToken(session.roomId, user.userId, true);
  }
}

@ApiTags('video')
@ApiBearerAuth()
@Controller('video')
class VideoController {
  constructor(private readonly service: VideoService) {}

  @Get(':consultationId/token')
  @Roles(Role.PARENT, Role.PEDIATRICIAN)
  token(
    @CurrentUser() user: AuthenticatedUser,
    @Param('consultationId') consultationId: string,
  ) {
    return this.service.getToken(user, consultationId);
  }
}

@Module({
  controllers: [VideoController],
  providers: [VideoService, { provide: VIDEO_PORT, useClass: LiveKitAdapter }],
})
export class VideoModule {}
