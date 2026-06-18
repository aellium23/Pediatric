import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../src/common/crypto/encryption.service';

describe('EncryptionService', () => {
  const config = {
    get: (k: string) => (k === 'encryptionKey' ? 'unit_test_key_unit_test_key_3232' : undefined),
  } as unknown as ConfigService;
  const svc = new EncryptionService(config);

  it('round-trips plaintext (AES-256-GCM)', () => {
    const plaintext = JSON.stringify({ allergies: ['penicillin'], medications: [] });
    const ciphertext = svc.encrypt(plaintext)!;
    expect(ciphertext).not.toContain('penicillin');
    expect(ciphertext.split('.')).toHaveLength(3);
    expect(svc.decrypt(ciphertext)).toEqual(plaintext);
  });

  it('returns null for null input', () => {
    expect(svc.encrypt(null)).toBeNull();
    expect(svc.decrypt(null)).toBeNull();
  });

  it('produces a unique IV per call (non-deterministic ciphertext)', () => {
    const a = svc.encrypt('same');
    const b = svc.encrypt('same');
    expect(a).not.toEqual(b);
    expect(svc.decrypt(a)).toEqual('same');
    expect(svc.decrypt(b)).toEqual('same');
  });

  it('fails to decrypt tampered ciphertext (auth tag)', () => {
    const ct = svc.encrypt('secret')!;
    const [iv, , data] = ct.split('.');
    const tampered = `${iv}.${Buffer.from('0'.repeat(16)).toString('base64')}.${data}`;
    expect(() => svc.decrypt(tampered)).toThrow();
  });
});
