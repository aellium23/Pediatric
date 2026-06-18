import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Passkeys (WebAuthn / FIDO2) — phishing-resistant auth.
 * Challenges are returned to the client and echoed back on verify; in production
 * they are bound to a short-lived server-side session/cache.
 */
@Injectable()
export class PasskeyService {
  private readonly rpId: string;
  private readonly rpName: string;
  private readonly origin: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.rpId = config.get('webauthn.rpId')!;
    this.rpName = config.get('webauthn.rpName')!;
    this.origin = config.get('webauthn.origin')!;
  }

  async registrationOptions(userId: string, userName: string) {
    return generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userID: Buffer.from(userId),
      userName,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
  }

  async verifyRegistration(
    userId: string,
    expectedChallenge: string,
    response: Record<string, unknown>,
    deviceLabel?: string,
  ): Promise<{ verified: boolean }> {
    const verification = await verifyRegistrationResponse({
      response: response as any,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpId,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException('Passkey registration failed');
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
    await this.prisma.webAuthnCredential.create({
      data: {
        userId,
        credentialId: credentialID,
        publicKey: Buffer.from(credentialPublicKey),
        counter: BigInt(counter),
        transports: [],
        deviceLabel,
      },
    });
    return { verified: true };
  }

  async authenticationOptions() {
    return generateAuthenticationOptions({ rpID: this.rpId, userVerification: 'preferred' });
  }

  async verifyAuthentication(
    expectedChallenge: string,
    response: Record<string, unknown>,
  ): Promise<{ userId: string }> {
    const credentialId = (response as any).id as string;
    const cred = await this.prisma.webAuthnCredential.findUnique({
      where: { credentialId },
    });
    if (!cred) throw new UnauthorizedException('Unknown passkey');

    const verification = await verifyAuthenticationResponse({
      response: response as any,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpId,
      authenticator: {
        credentialID: cred.credentialId,
        credentialPublicKey: new Uint8Array(cred.publicKey),
        counter: Number(cred.counter),
        transports: cred.transports as any,
      },
    });

    if (!verification.verified) {
      throw new UnauthorizedException('Passkey authentication failed');
    }

    await this.prisma.webAuthnCredential.update({
      where: { id: cred.id },
      data: { counter: BigInt(verification.authenticationInfo.newCounter) },
    });
    return { userId: cred.userId };
  }
}
