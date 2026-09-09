import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LiveKitAdapter, VideoService } from '../../src/modules/video/video.module';

function build(over: { prisma?: Record<string, any>; port?: any } = {}) {
  const prisma: any = {
    videoSession: {
      findUnique: jest.fn().mockResolvedValue({
        id: 's1',
        roomId: 'room-1',
        startedAt: null,
        consultation: { familyId: 'fam1', pediatrician: { userId: 'pedUser' } },
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    familyMember: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
    ...over.prisma,
  };
  const port = over.port ?? {
    issueAccessToken: jest.fn().mockReturnValue({ token: 't', url: 'wss://x', roomId: 'room-1' }),
  };
  const service = new VideoService(prisma as any, port as any);
  return { service, prisma, port };
}

const parent = { userId: 'u1', role: 'PARENT' } as any;

describe('VideoService.getToken', () => {
  it('404s when there is no video session', async () => {
    const { service } = build({ prisma: { videoSession: { findUnique: jest.fn().mockResolvedValue(null) } } });
    await expect(service.getToken(parent, 'c1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a user who is neither in the family nor the pediatrician', async () => {
    const { service, port } = build({
      prisma: { familyMember: { findFirst: jest.fn().mockResolvedValue(null) } },
    });
    await expect(service.getToken({ userId: 'stranger' } as any, 'c1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(port.issueAccessToken).not.toHaveBeenCalled();
  });

  it('admits a family member and stamps startedAt on first join', async () => {
    const update = jest.fn().mockResolvedValue({});
    const { service, port } = build({
      prisma: {
        videoSession: {
          findUnique: jest.fn().mockResolvedValue({
            id: 's1',
            roomId: 'room-1',
            startedAt: null,
            consultation: { familyId: 'fam1', pediatrician: { userId: 'pedUser' } },
          }),
          update,
        },
        familyMember: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
      },
    });
    await service.getToken(parent, 'c1');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 's1' } }));
    expect(port.issueAccessToken).toHaveBeenCalledWith('room-1', 'u1', true);
  });

  it('admits the consultation pediatrician', async () => {
    const { service, port } = build({
      prisma: { familyMember: { findFirst: jest.fn().mockResolvedValue(null) } },
    });
    await service.getToken({ userId: 'pedUser' } as any, 'c1');
    expect(port.issueAccessToken).toHaveBeenCalledWith('room-1', 'pedUser', true);
  });

  it('does not re-stamp startedAt for an already-started session', async () => {
    const update = jest.fn();
    const { service } = build({
      prisma: {
        videoSession: {
          findUnique: jest.fn().mockResolvedValue({
            id: 's1',
            roomId: 'room-1',
            startedAt: new Date(),
            consultation: { familyId: 'fam1', pediatrician: { userId: 'pedUser' } },
          }),
          update,
        },
        familyMember: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
      },
    });
    await service.getToken(parent, 'c1');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('LiveKitAdapter.issueAccessToken', () => {
  const OLD = process.env;
  afterEach(() => {
    process.env = OLD;
  });

  it('issues a verifiable HS256 LiveKit JWT with a room grant when credentials are set', () => {
    process.env = { ...OLD, LIVEKIT_API_KEY: 'devkey', LIVEKIT_API_SECRET: 'secret', LIVEKIT_URL: 'wss://eu' };
    const { token, url, roomId } = new LiveKitAdapter().issueAccessToken('room-9', 'user-9', true);
    expect(url).toBe('wss://eu');
    expect(roomId).toBe('room-9');

    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    expect(header.alg).toBe('HS256');
    // verify() checks the HS256 signature against the secret (throws if invalid).
    const claims = new JwtService().verify(token, { secret: 'secret' }) as Record<string, any>;
    expect(claims.iss).toBe('devkey');
    expect(claims.sub).toBe('user-9');
    expect(claims.video).toEqual(
      expect.objectContaining({ room: 'room-9', roomJoin: true, canPublish: true, canSubscribe: true }),
    );
    expect(claims.exp - claims.iat).toBe(3600);
  });

  it('falls back to a dev-signed grant without credentials', () => {
    process.env = { ...OLD };
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
    const { token, roomId } = new LiveKitAdapter().issueAccessToken('room-d', 'user-d', false);
    expect(roomId).toBe('room-d');
    const claims = new JwtService().verify(token, { secret: 'dev-livekit-secret' }) as Record<string, any>;
    expect(claims.iss).toBe('demo');
    expect(claims.video.room).toBe('room-d');
  });
});
