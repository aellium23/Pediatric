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
import { createHmac, randomUUID } from 'crypto';
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
  private b64url(obj: unknown): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64url');
  }

  issueAccessToken(roomId: string, identity: string, canPublish: boolean): VideoAccess {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL ?? 'wss://video.pedia.local';

    if (apiKey && apiSecret) {
      // Real LiveKit JWT (HS256). ttl 1h.
      const now = Math.floor(Date.now() / 1000);
      const header = this.b64url({ alg: 'HS256', typ: 'JWT' });
      const body = this.b64url({
        iss: apiKey,
        sub: identity,
        nbf: now,
        iat: now,
        exp: now + 3600,
        jti: randomUUID(),
        video: { room: roomId, roomJoin: true, canPublish, canSubscribe: true },
      });
      const sig = createHmac('sha256', apiSecret).update(`${header}.${body}`).digest('base64url');
      return { token: `${header}.${body}.${sig}`, url, roomId };
    }

    // Demo fallback (no LiveKit credentials).
    const payload = this.b64url({ room: roomId, sub: identity, canPublish, nonce: randomUUID() });
    const sig = createHmac('sha256', 'dev-livekit-secret').update(payload).digest('base64url');
    return { token: `${payload}.${sig}`, url, roomId };
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
    if (!session) throw new NotFoundException('Video session not found');

    const inFamily = await this.prisma.familyMember.findFirst({
      where: { userId: user.userId, familyId: session.consultation.familyId },
    });
    const isPediatrician = session.consultation.pediatrician.userId === user.userId;
    if (!inFamily && !isPediatrician) {
      throw new ForbiddenException('Not a participant in this consultation');
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
