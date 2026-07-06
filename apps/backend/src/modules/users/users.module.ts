import { BadRequestException, Body, Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrentUser } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';

const PAYMENT_METHODS = ['card', 'mbway', 'apple_pay', 'google_pay'] as const;

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
        locale: true,
      },
    });
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
}

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
