import { Controller, Get, Injectable, Module, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrentUser, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';

/** GDPR data-subject rights: consents, access/portability export, erasure, invoices. */
@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  consents(userId: string) {
    return this.prisma.consent.findMany({
      where: { userId },
      orderBy: { grantedAt: 'desc' },
    });
  }

  async revokeConsent(userId: string, id: string) {
    await this.prisma.consent.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  /** Right of access + portability: a machine-readable copy of the user's data. */
  async export(user: AuthenticatedUser) {
    const account = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        role: true,
        locale: true,
        countryCode: true,
        createdAt: true,
      },
    });
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId: user.userId },
    });
    const familyIds = memberships.map((m) => m.familyId);
    const [children, consultations, consents, subscriptions, favorites, notifications] =
      await Promise.all([
        this.prisma.child.findMany({
          where: { familyId: { in: familyIds } },
          select: { id: true, name: true, birthDate: true, sex: true },
        }),
        this.prisma.consultation.findMany({
          where:
            user.role === Role.PEDIATRICIAN
              ? { pediatrician: { userId: user.userId } }
              : { familyId: { in: familyIds } },
          select: { id: true, type: true, status: true, priceCents: true, openedAt: true },
          orderBy: { openedAt: 'desc' },
          take: 1000,
        }),
        this.prisma.consent.findMany({ where: { userId: user.userId }, take: 1000 }),
        this.prisma.subscription.findMany({ where: { userId: user.userId }, take: 1000 }),
        this.prisma.favorite.findMany({ where: { userId: user.userId }, take: 1000 }),
        this.prisma.notification.findMany({ where: { userId: user.userId }, orderBy: { createdAt: 'desc' }, take: 1000 }),
      ]);
    return {
      exportedAt: new Date().toISOString(),
      account,
      children,
      consultations,
      consents,
      subscriptions,
      favorites,
      notifications,
    };
  }

  /** Right to erasure: anonymise the account (legal/audit records are retained). */
  async deleteAccount(userId: string) {
    // Families this user is the primary holder of → erase the children's
    // identifying data (special category). Encrypted clinical records are kept
    // under the legal/retention basis; the link is anonymised.
    const ownFamilies = await this.prisma.family.findMany({
      where: { primaryUserId: userId },
      select: { id: true },
    });
    const famIds = ownFamilies.map((f) => f.id);

    await this.prisma.$transaction([
      this.prisma.consent.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      // Revoke all sessions so the deleted account cannot mint new access
      // tokens; the current access token (≤15 min TTL) expires shortly after.
      this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      }),
      ...(famIds.length
        ? [
            this.prisma.child.updateMany({
              where: { familyId: { in: famIds } },
              data: { name: 'Criança removida' },
            }),
          ]
        : []),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          name: null,
          email: null,
          phone: null,
          appleSub: null,
          googleSub: null,
          status: 'deleted',
        },
      }),
    ]);
    return { deleted: true };
  }

  async invoices(user: AuthenticatedUser) {
    if (user.role === Role.PEDIATRICIAN) {
      const ped = await this.prisma.pediatrician.findUnique({ where: { userId: user.userId } });
      if (!ped) return { medical: [], commission: [] };
      const commission = await this.prisma.commissionInvoice.findMany({
        where: { pediatricianId: ped.id },
        orderBy: { issuedAt: 'desc' },
      });
      const medical = await this.prisma.invoice.findMany({
        where: { issuer: 'pediatrician', consultation: { pediatricianId: ped.id } },
        orderBy: { issuedAt: 'desc' },
      });
      return { medical, commission };
    }
    const memberships = await this.prisma.familyMember.findMany({ where: { userId: user.userId } });
    const medical = await this.prisma.invoice.findMany({
      where: { consultation: { familyId: { in: memberships.map((m) => m.familyId) } } },
      orderBy: { issuedAt: 'desc' },
    });
    return { medical, commission: [] };
  }
}

@ApiTags('privacy')
@ApiBearerAuth()
@Controller('privacy')
class PrivacyController {
  constructor(private readonly service: PrivacyService) {}

  @Get('consents')
  consents(@CurrentUser() user: AuthenticatedUser) {
    return this.service.consents(user.userId);
  }

  @Post('consents/:id/revoke')
  revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.revokeConsent(user.userId, id);
  }

  @Get('export')
  export(@CurrentUser() user: AuthenticatedUser) {
    return this.service.export(user);
  }

  @Post('delete-account')
  @Roles(Role.PARENT, Role.PEDIATRICIAN)
  deleteAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.service.deleteAccount(user.userId);
  }

  @Get('invoices')
  invoices(@CurrentUser() user: AuthenticatedUser) {
    return this.service.invoices(user);
  }
}

@Module({
  controllers: [PrivacyController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
