import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrentUser, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';

/**
 * Plan catalog (static). priceCents are illustrative monthly prices.
 *
 * `includedMessages` is the family's monthly allowance of MESSAGE
 * consultations. It is an entitlement, not stored value: nothing is
 * pre-loaded, nothing is refundable, and no balance is held — which is what
 * keeps this out of e-money/PSD2 territory. It resets on the 1st of each
 * calendar month, because a month a parent can point at beats a rolling window
 * they have to compute.
 *
 * The number is a commercial dial, not an engineering constant: change it here
 * — and only here: the advertised perk is generated from it, so the number a
 * family is shown cannot drift away from the number the allowance enforces.
 */
const euros = (cents: number): string => `€${(cents / 100).toFixed(2).replace('.', ',')}`;

const includedPerk = (n: number, capCents: number): string => {
  const head =
    n === 1
      ? '1 consulta por mensagem incluída por mês'
      : `${n} consultas por mensagem incluídas por mês`;
  return capCents > 0 ? `${head} (até ${euros(capCents)} cada)` : head;
};

const FAMILY_INCLUDED = 1;

/**
 * Per-consultation cap on what the inclusion covers.
 *
 * WHY IT EXISTS: the inclusion is a platform commitment, but the price is set
 * by each pediatrician. Without a cap the platform's cost per included
 * consultation is unbounded — a pediatrician charging €30 costs it €24 against
 * €9,90 of subscription revenue. With the cap, the family pays the difference
 * and the exposure per included consultation tops out at cap × (1 − comissão).
 *
 * Zero disables the cap (cover whatever the consultation costs).
 */
const FAMILY_COVERED_CAP_CENTS = 2000;

const PLANS: Record<
  SubscriptionPlan,
  {
    name: string;
    priceCents: number;
    role: Role;
    includedMessages: number;
    coveredCapCents: number;
    perks: string[];
  }
> = {
  FAMILY: {
    name: 'Plano Família',
    priceCents: 990,
    role: Role.PARENT,
    includedMessages: FAMILY_INCLUDED,
    coveredCapCents: FAMILY_COVERED_CAP_CENTS,
    perks: [
      includedPerk(FAMILY_INCLUDED, FAMILY_COVERED_CAP_CENTS),
      'Histórico de saúde ilimitado',
      'Prioridade no suporte',
    ],
  },
  PED_PRO: {
    name: 'Pediatra Pro',
    priceCents: 1900,
    role: Role.PEDIATRICIAN,
    includedMessages: 0,
    coveredCapCents: 0,
    perks: ['Comissão reduzida (15%)', 'Perfil em destaque no marketplace', 'Estatísticas avançadas'],
  },
};

/** First instant of the calendar month containing `now`, in UTC. */
export function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export interface Allowance {
  plan: SubscriptionPlan | null;
  includedMessages: number;
  usedMessages: number;
  remainingMessages: number;
  /** Most the inclusion pays per consultation, in cents. 0 = no cap. */
  coveredCapCents: number;
  periodStart: string;
}

class SubscribeDto {
  @ApiProperty({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;
}

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  plansFor(role: Role) {
    return Object.entries(PLANS)
      .filter(([, p]) => p.role === role)
      .map(([key, p]) => ({ plan: key, ...p }));
  }

  async mine(userId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      orderBy: { startedAt: 'desc' },
    });
    return sub
      ? { ...sub, catalog: PLANS[sub.plan] }
      : null;
  }

  /**
   * What the family's plan includes this month and how much is left.
   *
   * Usage is COUNTED FROM THE CONSULTATIONS themselves, not from a separate
   * counter — a counter and the consultations would eventually disagree, and
   * then a parent would be told they have credit they cannot spend.
   */
  async allowance(userId: string): Promise<Allowance> {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      orderBy: { startedAt: 'desc' },
    });
    const included = sub ? PLANS[sub.plan].includedMessages : 0;
    const coveredCapCents = sub ? PLANS[sub.plan].coveredCapCents : 0;
    const periodStart = monthStart();

    let used = 0;
    if (included > 0) {
      // The allowance belongs to the family, not to the individual account:
      // two guardians share one plan rather than getting one each.
      const families = await this.prisma.familyMember.findMany({
        where: { userId },
        select: { familyId: true },
      });
      const familyIds = families.map((f) => f.familyId);
      if (familyIds.length) {
        used = await this.prisma.consultation.count({
          where: {
            familyId: { in: familyIds },
            coveredCents: { gt: 0 },
            openedAt: { gte: periodStart },
          },
        });
      }
    }

    return {
      plan: sub?.plan ?? null,
      includedMessages: included,
      usedMessages: used,
      remainingMessages: Math.max(0, included - used),
      coveredCapCents,
      periodStart: periodStart.toISOString(),
    };
  }

  /**
   * How much of a MESSAGE consultation at `priceCents` this user's plan covers.
   *
   * Returns cents, not a boolean, because the plan has a per-consultation cap:
   * a cheap consultation is covered in full, an expensive one up to the cap,
   * and the family pays the rest. Zero means the allowance is spent (or there
   * is no plan) and the family pays everything.
   */
  async coverageFor(userId: string, priceCents: number): Promise<number> {
    const a = await this.allowance(userId);
    if (a.remainingMessages <= 0 || priceCents <= 0) return 0;
    const cap = a.coveredCapCents;
    return cap > 0 ? Math.min(priceCents, cap) : priceCents;
  }

  async subscribe(user: AuthenticatedUser, plan: SubscriptionPlan) {
    const def = PLANS[plan];
    if (def.role !== user.role) {
      throw new BadRequestException('Plano indisponível para este perfil.');
    }
    // Single active subscription per user: cancel any current one first.
    await this.prisma.subscription.updateMany({
      where: { userId: user.userId, status: SubscriptionStatus.ACTIVE },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
    });
    // No Stripe key in demo → the subscription is created directly (active).
    return this.prisma.subscription.create({
      data: { userId: user.userId, plan, priceCents: def.priceCents },
    });
  }

  async cancel(userId: string) {
    await this.prisma.subscription.updateMany({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
    });
    return { cancelled: true };
  }
}

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get('plans')
  @Roles(Role.PARENT, Role.PEDIATRICIAN)
  plans(@CurrentUser() user: AuthenticatedUser) {
    return this.service.plansFor(user.role);
  }

  @Get('me')
  @Roles(Role.PARENT, Role.PEDIATRICIAN)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.service.mine(user.userId);
  }

  /** What the plan includes this month and what is left of it. */
  @Get('allowance')
  @Roles(Role.PARENT)
  allowance(@CurrentUser() user: AuthenticatedUser) {
    return this.service.allowance(user.userId);
  }

  @Post()
  @Roles(Role.PARENT, Role.PEDIATRICIAN)
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubscribeDto) {
    return this.service.subscribe(user, dto.plan);
  }

  @Post('cancel')
  @Roles(Role.PARENT, Role.PEDIATRICIAN)
  cancel(@CurrentUser() user: AuthenticatedUser) {
    return this.service.cancel(user.userId);
  }
}

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
