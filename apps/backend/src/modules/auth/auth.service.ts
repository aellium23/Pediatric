import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthProvider, Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OidcService, OidcIdentity } from './oidc.service';
import { TokenService } from './token.service';
import { TokenResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oidc: OidcService,
    private readonly tokens: TokenService,
  ) {}

  async signInWithApple(identityToken: string): Promise<TokenResponseDto> {
    const identity = await this.oidc.verifyApple(identityToken);
    const user = await this.upsertFromOidc(identity);
    this.assertActive(user);
    return this.tokens.issue(user.id, user.role);
  }

  async signInWithGoogle(idToken: string): Promise<TokenResponseDto> {
    const identity = await this.oidc.verifyGoogle(idToken);
    const user = await this.upsertFromOidc(identity);
    this.assertActive(user);
    return this.tokens.issue(user.id, user.role);
  }

  async issueForUser(userId: string): Promise<TokenResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    this.assertActive(user);
    return this.tokens.issue(user.id, user.role);
  }

  /** DEV/TEST ONLY: issue tokens for an email without an external IdP.
   *  Guarded at the controller so it never runs in production. */
  async devLogin(email: string, role: Role = Role.PARENT): Promise<TokenResponseDto> {
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Auto-provisioning is a local/test convenience (e2e signs in as fresh
      // random addresses). On a deployed demo it lets any caller pollute the
      // real user table with accounts of their choosing, so there we only ever
      // hand out tokens for personas that already exist (the seeded demo ones).
      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException('Conta de demonstração desconhecida.');
      }
      user = await this.prisma.user.create({
        data: { email, emailVerified: true, role },
      });
    }
    this.assertActive(user);
    return this.tokens.issue(user.id, user.role);
  }

  /** A deactivated account cannot obtain new tokens (see AdminService.setUserStatus). */
  private assertActive(user: Pick<User, 'status'>): void {
    if (user.status === 'disabled') {
      throw new ForbiddenException('Conta desativada. Contacte o suporte.');
    }
  }

  private async upsertFromOidc(identity: OidcIdentity): Promise<User> {
    const subField = identity.provider === 'APPLE' ? 'appleSub' : 'googleSub';
    const provider =
      identity.provider === 'APPLE' ? AuthProvider.APPLE : AuthProvider.GOOGLE;

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { [subField]: identity.sub } as Prisma.UserWhereInput,
          ...(identity.email ? [{ email: identity.email }] : []),
        ],
      },
    });

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: { [subField]: identity.sub, authProvider: provider },
      });
    }

    return this.prisma.user.create({
      data: {
        email: identity.email ?? null,
        emailVerified: identity.emailVerified,
        authProvider: provider,
        [subField]: identity.sub,
      } as Prisma.UserCreateInput,
    });
  }
}
