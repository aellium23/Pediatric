import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface OidcIdentity {
  provider: 'APPLE' | 'GOOGLE';
  sub: string;
  email?: string;
  emailVerified: boolean;
}

/** Verifies Apple and Google identity tokens against their public keys. */
@Injectable()
export class OidcService {
  private readonly appleJwks = createRemoteJWKSet(
    new URL('https://appleid.apple.com/auth/keys'),
  );
  private readonly googleClient: OAuth2Client;

  constructor(private readonly config: ConfigService) {
    this.googleClient = new OAuth2Client(this.config.get('google.clientId'));
  }

  async verifyApple(identityToken: string): Promise<OidcIdentity> {
    try {
      const { payload } = await jwtVerify(identityToken, this.appleJwks, {
        issuer: this.config.get('apple.issuer'),
        audience: this.config.get('apple.clientId'),
      });
      return {
        provider: 'APPLE',
        sub: payload.sub as string,
        email: payload.email as string | undefined,
        emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      };
    } catch {
      throw new UnauthorizedException('Invalid Apple identity token');
    }
  }

  async verifyGoogle(idToken: string): Promise<OidcIdentity> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.config.get('google.clientId'),
      });
      const payload = ticket.getPayload();
      if (!payload) throw new Error('no payload');
      return {
        provider: 'GOOGLE',
        sub: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified ?? false,
      };
    } catch {
      throw new UnauthorizedException('Invalid Google ID token');
    }
  }
}
