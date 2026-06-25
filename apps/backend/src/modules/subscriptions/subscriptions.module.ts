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

// Plan catalog (static). priceCents are illustrative monthly prices.
const PLANS: Record<SubscriptionPlan, { name: string; priceCents: number; role: Role; perks: string[] }> = {
  FAMILY: {
    name: 'Plano Família',
    priceCents: 990,
    role: Role.PARENT,
    perks: ['10% de desconto nas consultas', 'Histórico de saúde ilimitado', 'Prioridade no suporte'],
  },
  PED_PRO: {
    name: 'Pediatra Pro',
    priceCents: 1900,
    role: Role.PEDIATRICIAN,
    perks: ['Comissão reduzida (15%)', 'Perfil em destaque no marketplace', 'Estatísticas avançadas'],
  },
};

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

  async subscribe(user: AuthenticatedUser, plan: SubscriptionPlan) {
    const def = PLANS[plan];
    if (def.role !== user.role) {
      throw new BadRequestException('Plan not available for this profile');
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
