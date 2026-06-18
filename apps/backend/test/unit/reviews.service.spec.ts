import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConsultationStatus } from '@prisma/client';
import { ReviewsService } from '../../src/modules/pediatricians/reviews.service';

function build(consultationOverrides: Record<string, any> = {}, memberFound = true, alreadyReviewed = false) {
  const consultation = {
    id: 'c1',
    familyId: 'f1',
    pediatricianId: 'p1',
    status: ConsultationStatus.CLOSED,
    ...consultationOverrides,
  };
  const prisma: any = {
    consultation: { findUnique: jest.fn().mockResolvedValue(consultation) },
    familyMember: { findFirst: jest.fn().mockResolvedValue(memberFound ? { id: 'm1' } : null) },
    review: {
      findUnique: jest.fn().mockResolvedValue(alreadyReviewed ? { id: 'r0' } : null),
      create: jest.fn().mockResolvedValue({ id: 'r1', rating: 5 }),
      aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 4.5 } }),
    },
    pediatrician: { update: jest.fn().mockResolvedValue({}) },
  };
  return { service: new ReviewsService(prisma), prisma };
}

describe('ReviewsService', () => {
  it('creates a verified review and recomputes the pediatrician rating', async () => {
    const { service, prisma } = build();
    const review = await service.create('user-1', { consultationId: 'c1', rating: 5 });
    expect(review.id).toBe('r1');
    expect(prisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ verified: true, rating: 5 }) }),
    );
    expect(prisma.pediatrician.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { ratingAvg: 4.5 },
    });
  });

  it('rejects reviews for consultations that are not closed', async () => {
    const { service } = build({ status: ConsultationStatus.OPEN });
    await expect(
      service.create('user-1', { consultationId: 'c1', rating: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the user is not in the consultation family', async () => {
    const { service } = build({}, false);
    await expect(
      service.create('user-x', { consultationId: 'c1', rating: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a duplicate review', async () => {
    const { service } = build({}, true, true);
    await expect(
      service.create('user-1', { consultationId: 'c1', rating: 4 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
