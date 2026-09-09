import { NotFoundException } from '@nestjs/common';
import { PediatriciansService } from '../../src/modules/pediatricians/pediatricians.service';

function build(pedFound = true) {
  const prisma: any = {
    pediatrician: {
      findUnique: jest.fn().mockResolvedValue(pedFound ? { id: 'ped1', services: [] } : null),
    },
    verificationDocument: {
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'doc1', status: 'pending', ...data })),
      findMany: jest.fn().mockResolvedValue([{ id: 'doc1', kind: 'cedula', status: 'pending' }]),
    },
  };
  const stripe: any = {};
  return { service: new PediatriciansService(prisma, stripe), prisma };
}

describe('PediatriciansService — credential documents', () => {
  it('submits a document as pending under the caller pediatrician', async () => {
    const { service, prisma } = build();
    const doc = await service.submitDocument('u-ped', {
      kind: 'cedula',
      fileName: 'cedula.pdf',
    });
    expect(doc.status).toBe('pending');
    expect(prisma.verificationDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pediatricianId: 'ped1', kind: 'cedula', fileName: 'cedula.pdf' }),
      }),
    );
  });

  it('lists only the caller pediatrician documents', async () => {
    const { service, prisma } = build();
    const docs = await service.listMyDocuments('u-ped');
    expect(docs).toHaveLength(1);
    expect(prisma.verificationDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pediatricianId: 'ped1' } }),
    );
  });

  it('throws when the caller has no pediatrician profile', async () => {
    const { service } = build(false);
    await expect(
      service.submitDocument('u-x', { kind: 'cedula', fileName: 'x.pdf' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
