import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PediatricianStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeService } from '../payments/stripe.service';
import {
  CreateServiceDto,
  MarketplaceQueryDto,
  UpdateProfileDto,
  UpdateServiceDto,
} from './dto/pediatricians.dto';

@Injectable()
export class PediatriciansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  /** Marketplace listing: only ACTIVE (verified) pediatricians, with filters. */
  async listMarketplace(q: MarketplaceQueryDto) {
    const serviceFilter: Prisma.PediatricianServiceWhereInput = { active: true };
    if (q.type) serviceFilter.type = q.type;
    if (q.maxPriceCents != null) serviceFilter.priceCents = { lte: q.maxPriceCents };

    return this.prisma.pediatrician.findMany({
      where: {
        status: PediatricianStatus.ACTIVE,
        ...(q.language ? { languages: { has: q.language } } : {}),
        ...(q.specialty ? { specialties: { has: q.specialty } } : {}),
        ...(q.minRating != null ? { ratingAvg: { gte: q.minRating } } : {}),
        services: { some: serviceFilter },
      },
      select: {
        id: true,
        bio: true,
        experienceYears: true,
        languages: true,
        specialties: true,
        ratingAvg: true,
        services: {
          where: { active: true },
          select: { id: true, type: true, priceCents: true, currency: true, slaHours: true },
        },
      },
      orderBy: { ratingAvg: 'desc' },
    });
  }

  async getPublic(id: string) {
    return this.prisma.pediatrician.findFirstOrThrow({
      where: { id, status: PediatricianStatus.ACTIVE },
      include: { services: { where: { active: true } } },
    });
  }

  async getMe(userId: string) {
    const ped = await this.prisma.pediatrician.findUnique({
      where: { userId },
      include: { services: true },
    });
    if (!ped) throw new NotFoundException('Pediatrician profile not found');
    return ped;
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const ped = await this.getMe(userId);
    return this.prisma.pediatrician.update({
      where: { id: ped.id },
      data: {
        bio: dto.bio,
        experienceYears: dto.experienceYears,
        languages: dto.languages,
        specialties: dto.specialties,
      },
    });
  }

  async createService(userId: string, dto: CreateServiceDto) {
    const ped = await this.getMe(userId);
    return this.prisma.pediatricianService.create({
      data: {
        pediatricianId: ped.id,
        type: dto.type,
        priceCents: dto.priceCents,
        slaHours: dto.slaHours,
        scopeText: dto.scopeText,
      },
    });
  }

  async updateService(userId: string, serviceId: string, dto: UpdateServiceDto) {
    await this.assertServiceOwner(userId, serviceId);
    return this.prisma.pediatricianService.update({
      where: { id: serviceId },
      data: { priceCents: dto.priceCents, slaHours: dto.slaHours, scopeText: dto.scopeText },
    });
  }

  async deactivateService(userId: string, serviceId: string) {
    await this.assertServiceOwner(userId, serviceId);
    return this.prisma.pediatricianService.update({
      where: { id: serviceId },
      data: { active: false },
    });
  }

  /** Create (or reuse) a Stripe connected account and return an onboarding link. */
  async createConnectOnboarding(userId: string, returnUrl: string) {
    const ped = await this.prisma.pediatrician.findUniqueOrThrow({
      where: { userId },
      include: { user: true },
    });
    let accountId = ped.stripeAccountId;
    if (!accountId) {
      accountId = await this.stripe.createConnectedAccount(ped.user.email ?? '');
      await this.prisma.pediatrician.update({
        where: { id: ped.id },
        data: { stripeAccountId: accountId },
      });
    }
    const url = await this.stripe.createAccountOnboardingLink(accountId, returnUrl);
    return { onboardingUrl: url };
  }

  /** Financial dashboard: net earnings, commission paid, counts. */
  async finance(userId: string) {
    const ped = await this.getMe(userId);
    const splits = await this.prisma.split.findMany({
      where: { payment: { consultation: { pediatricianId: ped.id } } },
    });
    const netCents = splits.reduce((s, x) => s + x.pediatricianAmount, 0);
    const commissionCents = splits.reduce((s, x) => s + x.platformFeeCents, 0);
    const invoices = await this.prisma.commissionInvoice.count({
      where: { pediatricianId: ped.id },
    });
    return {
      consultationsSettled: splits.length,
      grossCents: netCents + commissionCents,
      netCents,
      commissionCents,
      commissionInvoices: invoices,
      currency: 'EUR',
    };
  }

  private async assertServiceOwner(userId: string, serviceId: string) {
    const service = await this.prisma.pediatricianService.findUnique({
      where: { id: serviceId },
      include: { pediatrician: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    if (service.pediatrician.userId !== userId) {
      throw new ForbiddenException('Not your service');
    }
    return service;
  }
}
