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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly passkeys: PasskeyService,
    private readonly config: ConfigService,
  ) {}

  /** DEV/TEST ONLY — disabled in production. Lets you sign in without Apple/Google. */
  @Public()
  @Post('dev-login')
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
