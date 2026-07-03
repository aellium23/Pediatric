import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';
import { PediatricianStatus, ReferralStatus, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { CurrentUser, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';

class CreateReferralDto {
  @ApiProperty() @IsUUID() consultationId!: string;
  @ApiProperty() @IsUUID() toPediatricianId!: string;
  @ApiProperty() @IsString() @MaxLength(4000) reason!: string;
}
class OpinionDto {
  @ApiProperty() @IsString() @MaxLength(4000) opinion!: string;
}

/**
 * Doctor-to-doctor second opinion. The treating pediatrician refers a
 * consultation to a colleague with encrypted clinical context (`reason`);
 * the colleague accepts/declines and returns an encrypted `opinion`.
 * Self-contained: the referral carries its own context, so no cross-module
 * access to the original consultation messages or health records is granted.
 */
@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
  ) {}

  private async myPediatrician(userId: string) {
    const ped = await this.prisma.pediatrician.findUnique({ where: { userId } });
    if (!ped) throw new ForbiddenException('Perfil de pediatra não encontrado.');
    return ped;
  }

  /** Treating pediatrician refers their consultation to an active colleague. */
  async create(userId: string, dto: CreateReferralDto) {
    const me = await this.myPediatrician(userId);
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: dto.consultationId },
    });
    if (!consultation) throw new NotFoundException('Consulta não encontrada.');
    if (consultation.pediatricianId !== me.id) {
      throw new ForbiddenException('Apenas o pediatra responsável pode referenciar esta consulta.');
    }
    if (dto.toPediatricianId === me.id) {
      throw new BadRequestException('Não te podes referenciar a ti próprio.');
    }
    const target = await this.prisma.pediatrician.findUnique({
      where: { id: dto.toPediatricianId },
    });
    if (!target || target.status !== PediatricianStatus.ACTIVE) {
      throw new BadRequestException('O pediatra de destino não está disponível.');
    }
    const referral = await this.prisma.referral.create({
      data: {
        consultationId: dto.consultationId,
        fromPediatricianId: me.id,
        toPediatricianId: target.id,
        reason: this.crypto.encrypt(dto.reason) as string,
      },
    });
    return { id: referral.id, status: referral.status, createdAt: referral.createdAt };
  }

  /** Referrals addressed to me (colleague inbox). */
  async incoming(userId: string) {
    const me = await this.myPediatrician(userId);
    const rows = await this.prisma.referral.findMany({
      where: { toPediatricianId: me.id },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.shape(r));
  }

  /** Referrals I sent out. */
  async outgoing(userId: string) {
    const me = await this.myPediatrician(userId);
    const rows = await this.prisma.referral.findMany({
      where: { fromPediatricianId: me.id },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.shape(r));
  }

  async get(userId: string, id: string) {
    const { referral } = await this.assertParty(userId, id);
    return this.shape(referral);
  }

  /** Colleague accepts or declines the referral. */
  async respond(userId: string, id: string, accept: boolean) {
    const { me, referral } = await this.assertParty(userId, id);
    if (referral.toPediatricianId !== me.id) {
      throw new ForbiddenException('Apenas o pediatra destinatário pode responder.');
    }
    if (referral.status !== ReferralStatus.PENDING) {
      throw new BadRequestException('Referência já tratada.');
    }
    const updated = await this.prisma.referral.update({
      where: { id },
      data: {
        status: accept ? ReferralStatus.ACCEPTED : ReferralStatus.DECLINED,
        respondedAt: new Date(),
      },
    });
    return this.shape(updated);
  }

  /** Colleague returns the opinion, completing the referral. */
  async submitOpinion(userId: string, id: string, opinion: string) {
    const { me, referral } = await this.assertParty(userId, id);
    if (referral.toPediatricianId !== me.id) {
      throw new ForbiddenException('Apenas o pediatra destinatário pode responder.');
    }
    if (referral.status !== ReferralStatus.ACCEPTED) {
      throw new BadRequestException('A referência tem de ser aceite antes de responder.');
    }
    const updated = await this.prisma.referral.update({
      where: { id },
      data: {
        opinion: this.crypto.encrypt(opinion) as string,
        status: ReferralStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
    return this.shape(updated);
  }

  /** Authorization: caller must be the sender or the addressee. */
  private async assertParty(userId: string, id: string) {
    const me = await this.myPediatrician(userId);
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Referência não encontrada.');
    if (referral.fromPediatricianId !== me.id && referral.toPediatricianId !== me.id) {
      throw new ForbiddenException('Não fazes parte desta referência.');
    }
    return { me, referral };
  }

  private shape(r: {
    id: string;
    consultationId: string;
    fromPediatricianId: string;
    toPediatricianId: string;
    status: ReferralStatus;
    reason: string;
    opinion: string | null;
    createdAt: Date;
    respondedAt: Date | null;
    completedAt: Date | null;
  }) {
    return {
      id: r.id,
      consultationId: r.consultationId,
      fromPediatricianId: r.fromPediatricianId,
      toPediatricianId: r.toPediatricianId,
      status: r.status,
      reason: this.crypto.decryptSafe(r.reason),
      opinion: this.crypto.decryptSafe(r.opinion),
      createdAt: r.createdAt,
      respondedAt: r.respondedAt,
      completedAt: r.completedAt,
    };
  }
}

@ApiTags('referrals')
@ApiBearerAuth()
@Controller('referrals')
class ReferralsController {
  constructor(private readonly service: ReferralsService) {}

  @Post()
  @Roles(Role.PEDIATRICIAN)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReferralDto) {
    return this.service.create(user.userId, dto);
  }

  @Get('incoming')
  @Roles(Role.PEDIATRICIAN)
  incoming(@CurrentUser() user: AuthenticatedUser) {
    return this.service.incoming(user.userId);
  }

  @Get('outgoing')
  @Roles(Role.PEDIATRICIAN)
  outgoing(@CurrentUser() user: AuthenticatedUser) {
    return this.service.outgoing(user.userId);
  }

  @Get(':id')
  @Roles(Role.PEDIATRICIAN)
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.get(user.userId, id);
  }

  @Post(':id/accept')
  @Roles(Role.PEDIATRICIAN)
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.respond(user.userId, id, true);
  }

  @Post(':id/decline')
  @Roles(Role.PEDIATRICIAN)
  decline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.respond(user.userId, id, false);
  }

  @Post(':id/opinion')
  @Roles(Role.PEDIATRICIAN)
  opinion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: OpinionDto,
  ) {
    return this.service.submitOpinion(user.userId, id, dto.opinion);
  }
}

@Module({
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
