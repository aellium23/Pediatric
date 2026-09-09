import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../../common/security/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { OidcService } from './oidc.service';
import { PasskeyService } from './passkey.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokenService, OidcService, PasskeyService, JwtStrategy],
  exports: [TokenService],
})
export class AuthModule {}
