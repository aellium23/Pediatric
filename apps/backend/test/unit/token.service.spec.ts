import { Role } from '@prisma/client';
import { TokenService } from '../../src/modules/auth/token.service';

function build(over: { prisma?: Record<string, any> } = {}) {
  const jwt = { signAsync: jest.fn().mockResolvedValue('access.jwt') };
  const config = {
    get: jest.fn((k: string) => {
      const map: Record<string, any> = {
        'jwt.accessTtl': 900,
        'jwt.refreshTtl': 2592000,
        'jwt.accessSecret': 'secret',
      };
      return map[k];
    }),
  };
  const prisma: any = {
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'rt1' }),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    ...over.prisma,
  };
  // Deterministic hash so we can assert on stored hashes.
  const crypto = { hash: jest.fn((v: string) => `h:${v}`) };
  const service = new TokenService(jwt as any, config as any, prisma as any, crypto as any);
  return { service, jwt, prisma, crypto };
}

describe('TokenService', () => {
  describe('issue', () => {
    it('signs an access JWT and persists a hashed refresh token', async () => {
      const { service, jwt, prisma, crypto } = build();
      const res = await service.issue('u1', Role.PARENT, 'fam1');

      expect(res.accessToken).toBe('access.jwt');
      expect(res.expiresIn).toBe(900);
      expect(typeof res.refreshToken).toBe('string');
      expect(res.refreshToken.length).toBeGreaterThan(0);

      // The raw refresh token is never stored — only its hash.
      const stored = prisma.refreshToken.create.mock.calls[0][0].data.tokenHash;
      expect(stored).toBe(crypto.hash.mock.results[0].value);
      expect(stored).not.toBe(res.refreshToken);

      // Access claims carry sub/role/family.
      expect(jwt.signAsync).toHaveBeenCalledWith(
        { sub: 'u1', role: Role.PARENT, fam: 'fam1' },
        expect.objectContaining({ expiresIn: 900 }),
      );
    });
  });

  describe('rotate', () => {
    it('rejects an unknown refresh token', async () => {
      const { service, prisma } = build({
        prisma: { refreshToken: { findUnique: jest.fn().mockResolvedValue(null), updateMany: jest.fn() } },
      });
      await expect(service.rotate('nope')).rejects.toThrow('invalid_refresh_token');
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('rejects an expired refresh token', async () => {
      const { service } = build({
        prisma: {
          refreshToken: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'rt1',
              userId: 'u1',
              revoked: false,
              expiresAt: new Date(Date.now() - 1000),
              user: { role: Role.PARENT },
            }),
            updateMany: jest.fn(),
          },
        },
      });
      await expect(service.rotate('old')).rejects.toThrow('invalid_refresh_token');
    });

    it('detects reuse of an already-revoked token and revokes the whole family of sessions', async () => {
      const updateMany = jest.fn().mockResolvedValue({ count: 3 });
      const { service } = build({
        prisma: {
          refreshToken: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'rt1',
              userId: 'u1',
              revoked: true,
              expiresAt: new Date(Date.now() + 10000),
              user: { role: Role.PARENT },
            }),
            updateMany,
            update: jest.fn(),
          },
        },
      });
      await expect(service.rotate('reused')).rejects.toThrow('invalid_refresh_token');
      // Breach response: nuke every session for that user.
      expect(updateMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { revoked: true } });
    });

    it('rotates a valid token: revokes the old one and issues a fresh pair', async () => {
      const update = jest.fn().mockResolvedValue({});
      const create = jest.fn().mockResolvedValue({ id: 'rt2' });
      const { service, jwt } = build({
        prisma: {
          refreshToken: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'rt1',
              userId: 'u1',
              revoked: false,
              expiresAt: new Date(Date.now() + 100000),
              user: { role: Role.PEDIATRICIAN },
            }),
            update,
            create,
            updateMany: jest.fn(),
          },
        },
      });
      const res = await service.rotate('valid');
      // Old token revoked exactly once...
      expect(update).toHaveBeenCalledWith({ where: { id: 'rt1' }, data: { revoked: true } });
      // ...and a new refresh token persisted.
      expect(create).toHaveBeenCalledTimes(1);
      expect(res.accessToken).toBe('access.jwt');
      // New access token carries the user's role from the stored session.
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'u1', role: Role.PEDIATRICIAN }),
        expect.anything(),
      );
    });
  });
});
