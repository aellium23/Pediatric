import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from 'throttler';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { PasskeyService } from './passkey.service';
import { Public, CurrentUser } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';
import {
  AppleSignInDto,
  DevLoginDto,
  GoogleSignInDto,
  RefreshDto,
  PasskeyVerifyRegistrationDto,
  PasskeyVerifyAuthenticationDto,
  TokenResponseDto,
} from './dto/auth.dto';

/**
 * Anti-automation on the endpoints that mint or rotate credentials
 * (OWASP ASVS V2.2.1 / API Security Top 10 API4). The generic bucket is
 * 100 req/min, which is a comfortable rate for token-guessing or for
 * hammering an identity provider on our account; 20/min is not, and no real
 * client signs in twenty times a minute.
 */
const AUTH_RATE_LIMIT = { default: { limit: 20, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
@Throttle(AUTH_RATE_LIMIT)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly passkeys: PasskeyService,
    private readonly config: ConfigService,
  ) {}

  /**
   * DEV/TEST ONLY — disabled unless ENABLE_DEV_LOGIN is set. Lets you sign in
   * without Apple/Google, which is what powers the demo's profile picker.
   *
   * Throttled well below the generic bucket: this endpoint mints credentials,
   * so it should never be a comfortable place to hammer.
   */
  @Public()
  @Post('dev-login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  devLogin(@Body() dto: DevLoginDto): Promise<TokenResponseDto> {
    if (!this.config.get<boolean>('enableDevLogin')) {
      throw new NotFoundException();
    }
    return this.auth.devLogin(dto.email, dto.role);
  }

  @Public()
  @Post('apple')
  apple(@Body() dto: AppleSignInDto): Promise<TokenResponseDto> {
    return this.auth.signInWithApple(dto.identityToken);
  }

  @Public()
  @Post('google')
  google(@Body() dto: GoogleSignInDto): Promise<TokenResponseDto> {
    return this.auth.signInWithGoogle(dto.idToken);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto): Promise<TokenResponseDto> {
    try {
      return await this.tokens.rotate(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ── Passkeys ──
  @ApiBearerAuth()
  @Post('passkey/registration/options')
  registrationOptions(@CurrentUser() user: AuthenticatedUser) {
    return this.passkeys.registrationOptions(user.userId, user.userId);
  }

  @ApiBearerAuth()
  @Post('passkey/registration/verify')
  verifyRegistration(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PasskeyVerifyRegistrationDto,
  ) {
    return this.passkeys.verifyRegistration(
      user.userId,
      dto.challenge,
      dto.response,
      dto.deviceLabel,
    );
  }

  @Public()
  @Post('passkey/authentication/options')
  authenticationOptions() {
    return this.passkeys.authenticationOptions();
  }

  @Public()
  @Post('passkey/authentication/verify')
  async verifyAuthentication(
    @Body() dto: PasskeyVerifyAuthenticationDto,
  ): Promise<TokenResponseDto> {
    if (!dto.challenge) throw new BadRequestException('Falta o desafio (challenge) do passkey.');
    const { userId } = await this.passkeys.verifyAuthentication(dto.challenge, dto.response);
    return this.auth.issueForUser(userId);
  }
}
