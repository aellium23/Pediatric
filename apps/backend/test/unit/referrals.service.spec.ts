import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PediatricianStatus, ReferralStatus } from '@prisma/client';
import { ReferralsService } from '../../src/modules/referrals/referrals.module';

const crypto: any = {
  encrypt: (s: string | null | undefined) => (s == null ? null : `enc(${s})`),
  decrypt: (s: string | null | undefined) => (s == null ? null : s),
};

function build(over: Record<string, any> = {}) {
  const prisma: any = {
    pediatrician: {
      // First lookup resolves "me" (the caller); per-test overrides handle the target.
      findUnique: jest.fn(({ where }: any) => {
        if (where.userId) return Promise.resolve({ id: 'ped-me', userId: where.userId });
        if (where.id === 'ped-target') {
          return Promise.resolve({ id: 'ped-target', status: PediatricianStatus.ACTIVE });
        }
        if (where.id === 'ped-inactive') {
          return Promise.resolve({ id: 'ped-inactive', status: PediatricianStatus.PENDING });
        }
        return Promise.resolve(null);
      }),
    },
    consultation: {
      findUnique: jest.fn().mockResolvedValue({ id: 'cons1', pediatricianId: 'ped-me' }),
    },
    referral: {
      create: jest.fn(({ data }: any) =>
        Promise.resolve({ id: 'ref1', status: ReferralStatus.PENDING, createdAt: new Date(0), ...data }),
      ),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(({ data }: any) => Promise.resolve({ id: 'ref1', ...data })),
    },
    ...over,
  };
  return { service: new ReferralsService(prisma, crypto), prisma };
}

describe('ReferralsService', () => {
  describe('create', () => {
    const dto = { consultationId: 'cons1', toPediatricianId: 'ped-target', reason: 'contexto' };

    it('creates a PENDING referral and encrypts the clinical reason', async () => {
      const { service, prisma } = build();
      const res = await service.create('u-me', dto);
      expect(res.status).toBe(ReferralStatus.PENDING);
      expect(prisma.referral.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromPediatricianId: 'ped-me',
            toPediatricianId: 'ped-target',
            reason: 'enc(contexto)',
          }),
        }),
      );
    });

    it('rejects when the caller is not the treating pediatrician', async () => {
      const { service } = build({
        consultation: { findUnique: jest.fn().mockResolvedValue({ id: 'cons1', pediatricianId: 'other' }) },
      });
      await expect(service.create('u-me', dto)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects referring to oneself', async () => {
      const { service } = build();
      await expect(
        service.create('u-me', { ...dto, toPediatricianId: 'ped-me' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a target pediatrician that is not active', async () => {
      const { service } = build();
      await expect(
        service.create('u-me', { ...dto, toPediatricianId: 'ped-inactive' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the consultation does not exist', async () => {
      const { service } = build({
        consultation: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      await expect(service.create('u-me', dto)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('respond / authorization', () => {
    function withReferral(referral: any) {
      return build({
        pediatrician: { findUnique: jest.fn().mockResolvedValue({ id: 'ped-me', userId: 'u-me' }) },
        referral: {
          findUnique: jest.fn().mockResolvedValue(referral),
          update: jest.fn(({ data }: any) => Promise.resolve({ ...referral, ...data })),
        },
      });
    }

    it('rejects a caller who is neither sender nor addressee', async () => {
      const { service } = withReferral({
        id: 'ref1',
        fromPediatricianId: 'other-a',
        toPediatricianId: 'other-b',
        status: ReferralStatus.PENDING,
      });
      await expect(service.respond('u-me', 'ref1', true)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when the sender (not addressee) tries to respond', async () => {
      const { service } = withReferral({
        id: 'ref1',
        fromPediatricianId: 'ped-me',
        toPediatricianId: 'other-b',
        status: ReferralStatus.PENDING,
      });
      await expect(service.respond('u-me', 'ref1', true)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects responding to an already-handled referral', async () => {
      const { service } = withReferral({
        id: 'ref1',
        fromPediatricianId: 'other-a',
        toPediatricianId: 'ped-me',
        status: ReferralStatus.ACCEPTED,
      });
      await expect(service.respond('u-me', 'ref1', true)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts a pending referral addressed to the caller', async () => {
      const { service } = withReferral({
        id: 'ref1',
        fromPediatricianId: 'other-a',
        toPediatricianId: 'ped-me',
        status: ReferralStatus.PENDING,
        reason: 'enc(x)',
        opinion: null,
        createdAt: new Date(0),
        respondedAt: null,
        completedAt: null,
      });
      const res = await service.respond('u-me', 'ref1', true);
      expect(res.status).toBe(ReferralStatus.ACCEPTED);
    });
  });
});
