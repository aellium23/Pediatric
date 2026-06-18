import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { TokenResponseDto } from './dto/auth.dto';

/** Issues and rotates OAuth 2.1 access/refresh tokens. */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
  ) {}

  async issue(userId: string, role: Role, familyId?: string): Promise<TokenResponseDto> {
    const accessTtl = this.config.get<number>('jwt.accessTtl')!;
    const refreshTtl = this.config.get<number>('jwt.refreshTtl')!;

    const accessToken = await this.jwt.signAsync(
      { sub: userId, role, fam: familyId },
      { secret: this.config.get('jwt.accessSecret'), expiresIn: accessTtl },
    );

    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.crypto.hash(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return { accessToken, refreshToken, expiresIn: accessTtl };
  }

  /** Rotating refresh: old token is revoked, reuse is detected. */
  async rotate(refreshToken: string): Promise<TokenResponseDto> {
    const tokenHash = this.crypto.hash(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      // Reuse / invalid → revoke all sessions for safety.
      if (stored?.revoked) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: stored.userId },
          data: { revoked: true },
        });
      }
      throw new Error('invalid_refresh_token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    return this.issue(stored.userId, stored.user.role);
  }
}
