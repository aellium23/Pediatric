import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'crypto';

/**
 * Field-level encryption for clinical-sensitive data (AES-256-GCM).
 * Format stored: base64(iv).base64(authTag).base64(ciphertext)
 * In production the key is sourced from AWS KMS (envelope encryption);
 * here it is derived from FIELD_ENCRYPTION_KEY for local/dev parity.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(config: ConfigService) {
    const raw = config.get<string>('encryptionKey') ?? '';
    // Normalize to a 32-byte key.
    this.key = createHash('sha256').update(raw).digest();
  }

  encrypt(plaintext: string | null | undefined): string | null {
    if (plaintext == null) return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key, iv, { authTagLength: 16 });
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
  }

  decrypt(payload: string | null | undefined): string | null {
    if (payload == null) return null;
    const [ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(ivB64, 'base64'),
      { authTagLength: 16 },
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  }

  /**
   * Read-path variant: never throws. A value that fails auth (wrong key, bit
   * rot, legacy plaintext) yields null instead of 500ing an entire list.
   * Write/critical paths keep using decrypt() so hard failures stay visible.
   */
  decryptSafe(payload: string | null | undefined): string | null {
    try {
      return this.decrypt(payload);
    } catch {
      return null;
    }
  }

  /** One-way hash for tokens (refresh token storage). */
  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
