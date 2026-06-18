import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConsultationStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReviewDto } from './dto/pediatricians.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Parent leaves a verified review after a closed consultation. */
  async create(userId: string, dto: CreateReviewDto) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: dto.consultationId },
    });
    if (!consultation) throw new NotFoundException('Consultation not found');

    const member = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: consultation.familyId },
    });
    if (!member) throw new ForbiddenException('Not authorized for this consultation');
    if (consultation.status !== ConsultationStatus.CLOSED) {
      throw new BadRequestException('Consultation must be closed before reviewing');
    }

    const existing = await this.prisma.review.findUnique({
      where: { consultationId: consultation.id },
    });
    if (existing) throw new BadRequestException('Consultation already reviewed');

    const review = await this.prisma.review.create({
      data: {
        consultationId: consultation.id,
        familyId: consultation.familyId,
        pediatricianId: consultation.pediatricianId,
        rating: dto.rating,
        comment: dto.comment,
        verified: true,
      },
    });

    await this.recomputeRating(consultation.pediatricianId);
    return review;
  }

  listForPediatrician(pediatricianId: string) {
    return this.prisma.review.findMany({
      where: { pediatricianId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, rating: true, comment: true, verified: true, createdAt: true },
    });
  }

  private async recomputeRating(pediatricianId: string): Promise<void> {
    const agg = await this.prisma.review.aggregate({
      where: { pediatricianId },
      _avg: { rating: true },
    });
    await this.prisma.pediatrician.update({
      where: { id: pediatricianId },
      data: { ratingAvg: agg._avg.rating ?? 0 },
    });
  }
}
