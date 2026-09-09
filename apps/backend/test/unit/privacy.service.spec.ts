import { Role } from '@prisma/client';
import { PrivacyService } from '../../src/modules/privacy/privacy.module';
import { AuthenticatedUser } from '../../src/common/security/jwt.strategy';

function build() {
  const prisma: any = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.c', role: Role.PARENT }),
      update: jest.fn().mockReturnValue({ op: 'user.update' }),
    },
    family: { findMany: jest.fn().mockResolvedValue([{ id: 'fam1' }]) },
    familyMember: { findMany: jest.fn().mockResolvedValue([{ familyId: 'fam1' }]) },
    child: {
      findMany: jest.fn().mockResolvedValue([{ id: 'ch1' }]),
      updateMany: jest.fn().mockReturnValue({ op: 'child.updateMany' }),
    },
    consultation: { findMany: jest.fn().mockResolvedValue([]) },
    consent: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockReturnValue({ op: 'consent.updateMany' }),
    },
    refreshToken: { updateMany: jest.fn().mockReturnValue({ op: 'refreshToken.updateMany' }) },
    analyticsEvent: { updateMany: jest.fn().mockReturnValue({ op: 'analyticsEvent.updateMany' }) },
    subscription: { findMany: jest.fn().mockResolvedValue([]) },
    favorite: { findMany: jest.fn().mockResolvedValue([]) },
    notification: { findMany: jest.fn().mockResolvedValue([]) },
    pediatrician: { findUnique: jest.fn().mockResolvedValue({ id: 'ped1' }) },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const fhir: any = { bundlesForUser: jest.fn().mockResolvedValue([]) };
  return { service: new PrivacyService(prisma, fhir), prisma, fhir };
}

const parent: AuthenticatedUser = { userId: 'u1', role: Role.PARENT };
const ped: AuthenticatedUser = { userId: 'u1', role: Role.PEDIATRICIAN };

describe('PrivacyService (GDPR)', () => {
  describe('export', () => {
    it('scopes a parent export to their family consultations', async () => {
      const { service, prisma } = build();
      const dump = await service.export(parent);
      expect(dump.account).toBeTruthy();
      expect(dump.children).toEqual([{ id: 'ch1' }]);
      expect(prisma.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { familyId: { in: ['fam1'] } } }),
      );
    });

    it('scopes a pediatrician export to consultations they attended', async () => {
      const { service, prisma } = build();
      await service.export(ped);
      expect(prisma.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { pediatrician: { userId: 'u1' } } }),
      );
    });
  });

  describe('deleteAccount (erasure)', () => {
    it('anonymises the account and revokes consents in one transaction', async () => {
      const { service, prisma } = build();
      const res = await service.deleteAccount('u1');
      expect(res).toEqual({ deleted: true });
      // The user update strips PII and marks the account deleted.
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({ email: null, phone: null, status: 'deleted' }),
        }),
      );
      // Instrumentation events survive as anonymous counts: the funnel stays
      // usable, but the events stop pointing at a person.
      expect(prisma.analyticsEvent.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { userId: null },
      });
      // Active consents are revoked as part of the same transaction.
      expect(prisma.consent.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', revokedAt: null } }),
      );
      // All sessions revoked so the deleted account cannot mint new access tokens.
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', revoked: false } }),
      );
      // Children of families this user primarily holds are de-identified.
      expect(prisma.child.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { familyId: { in: ['fam1'] } } }),
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('revokeConsent', () => {
    it('marks the consent revoked for the owning user only', async () => {
      const { service, prisma } = build();
      prisma.consent.updateMany = jest.fn().mockResolvedValue({ count: 1 });
      const res = await service.revokeConsent('u1', 'consent-1');
      expect(res).toEqual({ revoked: true });
      expect(prisma.consent.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'consent-1', userId: 'u1', revokedAt: null } }),
      );
    });
  });
});
