import { ForbiddenException } from '@nestjs/common';
import { ChildrenService } from '../../src/modules/children/children.service';

const CHILD = {
  id: 'ch1',
  familyId: 'fam1',
  name: 'Tomás',
  birthDate: new Date('2021-06-01'),
  sex: 'M',
  healthProfile: null,
  snsNumber: 'enc(123456789)',
};

function build(over: { prisma?: Record<string, any> } = {}) {
  const prisma: any = {
    child: {
      findUnique: jest.fn().mockResolvedValue(CHILD),
      findMany: jest.fn().mockResolvedValue([CHILD]),
      update: jest.fn().mockResolvedValue({}),
    },
    familyMember: {
      findFirst: jest.fn().mockResolvedValue({ id: 'm1', familyId: 'fam1', userId: 'u1' }),
      findMany: jest.fn().mockResolvedValue([{ familyId: 'fam1', userId: 'u1' }]),
    },
    ...over.prisma,
  };
  // Mock crypto mirroring EncryptionService semantics (null-safe both ways).
  const crypto: any = {
    encrypt: jest.fn((v: string | null) => (v == null ? null : `enc(${v})`)),
    decryptSafe: jest.fn((v: string | null) => {
      const m = v ? /^enc\((.*)\)$/.exec(v) : null;
      return m ? m[1] : null;
    }),
  };
  return { service: new ChildrenService(prisma as any, crypto as any), prisma, crypto };
}

describe('ChildrenService SNS number', () => {
  it('encrypts before storing (never plaintext at rest)', async () => {
    const { service, prisma, crypto } = build();
    await service.setSns('u1', 'ch1', '123456789');
    expect(crypto.encrypt).toHaveBeenCalledWith('123456789');
    expect(prisma.child.update).toHaveBeenCalledWith({
      where: { id: 'ch1' },
      data: { snsNumber: 'enc(123456789)' },
    });
  });

  it('null clears the stored ciphertext', async () => {
    const { service, prisma } = build();
    await service.setSns('u1', 'ch1', null);
    expect(prisma.child.update).toHaveBeenCalledWith({
      where: { id: 'ch1' },
      data: { snsNumber: null },
    });
  });

  it('roundtrip: the child detail returns the decrypted SNS number', async () => {
    const { service } = build();
    const child = await service.getOne('u1', 'ch1');
    expect((child as any).snsNumber).toBe('123456789');
    // Ciphertext must not leak alongside the decrypted value.
    expect(JSON.stringify(child)).not.toContain('enc(');
  });

  it('does NOT decrypt or expose the SNS number in the children list', async () => {
    const { service, crypto } = build();
    const [child] = await service.listForUser('u1');
    expect('snsNumber' in (child as any)).toBe(false);
    expect(crypto.decryptSafe).not.toHaveBeenCalledWith('enc(123456789)');
  });

  it('only family members can set it', async () => {
    const { service, prisma } = build({
      prisma: {
        familyMember: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
        },
      },
    });
    await expect(service.setSns('intruder', 'ch1', '123456789')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.child.update).not.toHaveBeenCalled();
  });
});
