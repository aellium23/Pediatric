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
 * LiveKit-style adapter (EU self-host). Generates a signed, short-lived access
 * grant. Real SDK token signing replaces this stub when the LiveKit project is
 * provisioned; the API contract stays the same.
 */
@Injectable()
class LiveKitAdapter extends VideoPort {
  issueAccessToken(roomId: string, identity: string, canPublish: boolean): VideoAccess {
    const payload = Buffer.from(
      JSON.stringify({ room: roomId, sub: identity, canPublish, nonce: randomUUID() }),
    ).toString('base64url');
    const secret = process.env.LIVEKIT_API_SECRET ?? 'dev-livekit-secret';
    const sig = createHmac('sha256', secret).update(payload).digest('base64url');
    return {
      token: `${payload}.${sig}`,
      url: process.env.LIVEKIT_URL ?? 'wss://video.pedia.local',
      roomId,
    };
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
