import { AuthProvider, Role } from '@prisma/client';
import { AuthService } from '../../src/modules/auth/auth.service';

function build(over: { prisma?: Record<string, any>; oidc?: any } = {}) {
  const prisma: any = {
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'newU', role: Role.PARENT }),
      update: jest.fn().mockResolvedValue({ id: 'exU', role: Role.PEDIATRICIAN }),
    },
    ...over.prisma,
  };
  const oidc = over.oidc ?? {
    verifyApple: jest.fn(),
    verifyGoogle: jest.fn(),
  };
  const tokens = { issue: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r', expiresIn: 900 }) };
  const service = new AuthService(prisma as any, oidc as any, tokens as any);
  return { service, prisma, oidc, tokens };
}

describe('AuthService', () => {
  describe('signInWithApple (new user)', () => {
    it('creates a user from the verified identity and issues tokens for it', async () => {
      const { service, prisma, tokens } = build({
        oidc: {
          verifyApple: jest.fn().mockResolvedValue({
            provider: 'APPLE',
            sub: 'apple-123',
            email: 'p@a.pt',
            emailVerified: true,
          }),
        },
      });
      const res = await service.signInWithApple('tok');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'p@a.pt',
            emailVerified: true,
            authProvider: AuthProvider.APPLE,
            appleSub: 'apple-123',
          }),
        }),
      );
      expect(tokens.issue).toHaveBeenCalledWith('newU', Role.PARENT);
      expect(res.accessToken).toBe('a');
    });
  });

  describe('signInWithGoogle (existing account linking)', () => {
    it('links the Google sub onto an account already found by email', async () => {
      const { service, prisma, tokens } = build({
        prisma: {
          user: {
            findFirst: jest.fn().mockResolvedValue({ id: 'exU', role: Role.PEDIATRICIAN }),
            update: jest.fn().mockResolvedValue({ id: 'exU', role: Role.PEDIATRICIAN }),
            create: jest.fn(),
          },
        },
        oidc: {
          verifyGoogle: jest.fn().mockResolvedValue({
            provider: 'GOOGLE',
            sub: 'g-9',
            email: 'doc@x.pt',
            emailVerified: true,
          }),
        },
      });
      await service.signInWithGoogle('tok');
      // Existing account updated (linked), never duplicated.
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'exU' },
          data: expect.objectContaining({ googleSub: 'g-9', authProvider: AuthProvider.GOOGLE }),
        }),
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
      // Issues with the EXISTING user's role, not a default.
      expect(tokens.issue).toHaveBeenCalledWith('exU', Role.PEDIATRICIAN);
    });
  });

  describe('upsert search', () => {
    it('matches by provider sub or email', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const { service } = build({
        prisma: {
          user: { findFirst, create: jest.fn().mockResolvedValue({ id: 'n', role: Role.PARENT }) },
        },
        oidc: {
          verifyApple: jest
            .fn()
            .mockResolvedValue({ provider: 'APPLE', sub: 's', email: 'e@e.pt', emailVerified: false }),
        },
      });
      await service.signInWithApple('tok');
      const where = findFirst.mock.calls[0][0].where;
      expect(where.OR).toEqual(
        expect.arrayContaining([{ appleSub: 's' }, { email: 'e@e.pt' }]),
      );
    });

    it('omits the email clause when the identity has no email', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const { service } = build({
        prisma: {
          user: { findFirst, create: jest.fn().mockResolvedValue({ id: 'n', role: Role.PARENT }) },
        },
        oidc: {
          verifyApple: jest
            .fn()
            .mockResolvedValue({ provider: 'APPLE', sub: 's', email: undefined, emailVerified: false }),
        },
      });
      await service.signInWithApple('tok');
      const where = findFirst.mock.calls[0][0].where;
      expect(where.OR).toEqual([{ appleSub: 's' }]);
    });
  });

  describe('devLogin', () => {
    it('creates a verified user on first login and issues tokens', async () => {
      const { service, prisma, tokens } = build({
        prisma: {
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'dev', role: Role.CLINIC_ADMIN }),
          },
        },
      });
      await service.devLogin('a@b.pt', Role.CLINIC_ADMIN);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ emailVerified: true, role: Role.CLINIC_ADMIN }) }),
      );
      expect(tokens.issue).toHaveBeenCalledWith('dev', Role.CLINIC_ADMIN);
    });

    it('reuses an existing user without recreating', async () => {
      const create = jest.fn();
      const { service } = build({
        prisma: {
          user: {
            findUnique: jest.fn().mockResolvedValue({ id: 'old', role: Role.PARENT }),
            create,
          },
        },
      });
      await service.devLogin('a@b.pt');
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('deactivated accounts', () => {
    it('refuses devLogin for a disabled user and issues no tokens', async () => {
      const { service, tokens } = build({
        prisma: {
          user: {
            findUnique: jest.fn().mockResolvedValue({ id: 'x', role: Role.PARENT, status: 'disabled' }),
            create: jest.fn(),
          },
        },
      });
      await expect(service.devLogin('a@b.pt')).rejects.toThrow(/desativada/i);
      expect(tokens.issue).not.toHaveBeenCalled();
    });

    it('refuses OIDC sign-in for a disabled existing account', async () => {
      const { service, tokens } = build({
        prisma: {
          user: {
            findFirst: jest.fn().mockResolvedValue({ id: 'exU', role: Role.PEDIATRICIAN }),
            update: jest.fn().mockResolvedValue({ id: 'exU', role: Role.PEDIATRICIAN, status: 'disabled' }),
            create: jest.fn(),
          },
        },
        oidc: {
          verifyGoogle: jest
            .fn()
            .mockResolvedValue({ provider: 'GOOGLE', sub: 'g-9', email: 'doc@x.pt', emailVerified: true }),
        },
      });
      await expect(service.signInWithGoogle('tok')).rejects.toThrow(/desativada/i);
      expect(tokens.issue).not.toHaveBeenCalled();
    });

    it('allows login for an active user (status set)', async () => {
      const { service, tokens } = build({
        prisma: {
          user: {
            findUnique: jest.fn().mockResolvedValue({ id: 'ok', role: Role.PARENT, status: 'active' }),
            create: jest.fn(),
          },
        },
      });
      await service.devLogin('a@b.pt');
      expect(tokens.issue).toHaveBeenCalledWith('ok', Role.PARENT);
    });
  });
});
