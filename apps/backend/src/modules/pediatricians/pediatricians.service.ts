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
  SubmitDocumentDto,
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

    const peds = await this.prisma.pediatrician.findMany({
      where: {
        status: PediatricianStatus.ACTIVE,
        ...(q.language ? { languages: { has: q.language } } : {}),
        ...(q.specialty ? { specialties: { has: q.specialty } } : {}),
        ...(q.region ? { region: q.region } : {}),
        ...(q.minRating != null ? { ratingAvg: { gte: q.minRating } } : {}),
        services: { some: serviceFilter },
      },
      select: {
        id: true,
        displayName: true,
        bio: true,
        experienceYears: true,
        languages: true,
        specialties: true,
        region: true,
        ratingAvg: true,
        services: {
          where: { active: true },
          select: { id: true, type: true, priceCents: true, currency: true, slaHours: true },
        },
      },
      orderBy: { ratingAvg: 'desc' },
    });

    // Attach the weekdays each pediatrician has availability on (one query) so
    // the marketplace can show "available" and the parent knows booking works.
    const weekdays = await this.availableWeekdaysByPediatrician(peds.map((p) => p.id));
    return peds.map((p) => ({ ...p, availableWeekdays: weekdays.get(p.id) ?? [] }));
  }

  /** Distinct availability weekdays per pediatrician, for the given ids. */
  private async availableWeekdaysByPediatrician(ids: string[]): Promise<Map<string, number[]>> {
    const out = new Map<string, number[]>();
    if (!ids.length) return out;
    const blocks = await this.prisma.availability.findMany({
      where: { pediatricianId: { in: ids } },
      select: { pediatricianId: true, weekday: true },
    });
    for (const b of blocks) {
      const set = out.get(b.pediatricianId) ?? [];
      if (!set.includes(b.weekday)) set.push(b.weekday);
      out.set(b.pediatricianId, set);
    }
    for (const [k, v] of out) out.set(k, v.sort((a, b) => a - b));
    return out;
  }

  async getPublic(id: string) {
    // Public, unauthenticated endpoint → explicit projection only. Never expose
    // userId, licenseNumber, stripeAccountId or other internal fields.
    const ped = await this.prisma.pediatrician.findFirst({
      where: { id, status: PediatricianStatus.ACTIVE },
      select: {
        id: true,
        displayName: true,
        bio: true,
        experienceYears: true,
        languages: true,
        specialties: true,
        region: true,
        ratingAvg: true,
        services: {
          where: { active: true },
          select: { id: true, type: true, priceCents: true, currency: true, slaHours: true },
        },
      },
    });
    if (!ped) throw new NotFoundException('Pediatra não encontrado.');
    const weekdays = await this.availableWeekdaysByPediatrician([ped.id]);
    return { ...ped, availableWeekdays: weekdays.get(ped.id) ?? [] };
  }

  async getMe(userId: string) {
    const ped = await this.prisma.pediatrician.findUnique({
      where: { userId },
      include: { services: true },
    });
    if (!ped) throw new NotFoundException('Perfil de pediatra não encontrado.');
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
        region: dto.region,
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

  /** Pediatrician submits a credential document for compliance review. */
  async submitDocument(userId: string, dto: SubmitDocumentDto) {
    const ped = await this.getMe(userId);
    return this.prisma.verificationDocument.create({
      data: {
        pediatricianId: ped.id,
        kind: dto.kind,
        fileName: dto.fileName,
        storageKey: dto.storageKey,
      },
    });
  }

  /** Pediatrician lists their own credential documents and review status. */
  async listMyDocuments(userId: string) {
    const ped = await this.getMe(userId);
    return this.prisma.verificationDocument.findMany({
      where: { pediatricianId: ped.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertServiceOwner(userId: string, serviceId: string) {
    const service = await this.prisma.pediatricianService.findUnique({
      where: { id: serviceId },
      include: { pediatrician: true },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado.');
    if (service.pediatrician.userId !== userId) {
      throw new ForbiddenException('Este serviço não é teu.');
    }
    return service;
  }
}
