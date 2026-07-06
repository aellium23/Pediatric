import { BadRequestException, Body, Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrentUser } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';

const PAYMENT_METHODS = ['card', 'mbway', 'apple_pay', 'google_pay'] as const;

/**
 * Standard PT NIF validation: 9 digits where the last is a mod-11 check digit
 * over the first 8 (weights 9..2; a check of 10/11 maps to 0).
 */
export function isValidNif(nif: string): boolean {
  if (!/^\d{9}$/.test(nif)) return false;
  const digits = [...nif].map(Number);
  const sum = digits.slice(0, 8).reduce((acc, d, i) => acc + d * (9 - i), 0);
  const check = 11 - (sum % 11);
  return digits[8] === (check >= 10 ? 0 : check);
}

class SetPhotoDto {
  // Client resizes to ≤256px before upload, so a data URL stays small; an
  // https URL (S3) is also accepted for when object storage is provisioned.
  @ApiProperty() @IsString() @MaxLength(300_000) photoUrl!: string;
}

class SetPaymentDto {
  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsOptional()
  @IsIn(PAYMENT_METHODS as unknown as string[])
  method?: (typeof PAYMENT_METHODS)[number];
}

class SetBillingDto {
  // Fiscal ID for "fatura com NIF"; omit or send null to clear it.
  @ApiProperty({ required: false, nullable: true, example: '123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  nif?: string | null;
}

function assertPhotoShape(photoUrl: string): void {
  const ok = photoUrl.startsWith('data:image/') || photoUrl.startsWith('https://');
  if (!ok) throw new BadRequestException('Formato de imagem inválido.');
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        photoUrl: true,
        preferredPayment: true,
        nif: true,
        locale: true,
      },
    });
  }

  /** Sets (or clears, with null) the consumer-invoice NIF. */
  async setBilling(userId: string, nif?: string | null) {
    if (nif != null && !isValidNif(nif)) {
      throw new BadRequestException('NIF inválido.');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { nif: nif ?? null } });
    return { ok: true, nif: nif ?? null };
  }

  async setPhoto(userId: string, photoUrl: string) {
    assertPhotoShape(photoUrl);
    await this.prisma.user.update({ where: { id: userId }, data: { photoUrl } });
    return { ok: true };
  }

  async removePhoto(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { photoUrl: null } });
    return { ok: true };
  }

  async setPaymentMethod(userId: string, method?: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferredPayment: method ?? null },
    });
    return { ok: true, method: method ?? null };
  }
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.service.me(user.userId);
  }

  @Post('me/photo')
  setPhoto(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetPhotoDto) {
    return this.service.setPhoto(user.userId, dto.photoUrl);
  }

  @Post('me/photo/remove')
  removePhoto(@CurrentUser() user: AuthenticatedUser) {
    return this.service.removePhoto(user.userId);
  }

  @Post('me/payment-method')
  setPayment(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetPaymentDto) {
    return this.service.setPaymentMethod(user.userId, dto.method);
  }

  @Post('me/billing')
  setBilling(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetBillingDto) {
    return this.service.setBilling(user.userId, dto.nif);
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
