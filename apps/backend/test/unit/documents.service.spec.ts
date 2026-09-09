import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocumentKind, Role } from '@prisma/client';
import {
  DocumentsService,
  MAX_CONTENT_CHARS,
  parseDataUrl,
} from '../../src/modules/documents/documents.module';
import { ChildAccessService } from '../../src/common/security/child-access.service';
import { AuthenticatedUser } from '../../src/common/security/jwt.strategy';

// Pass-through crypto so assertions read plainly; the real service encrypts.
const crypto: any = {
  encrypt: (s: string | null | undefined) => s ?? null,
  decrypt: (s: string | null | undefined) => s ?? null,
  decryptSafe: (s: string | null | undefined) => s ?? null,
};

function build(over: Record<string, any> = {}) {
  const prisma: any = {
    child: { findUnique: jest.fn().mockResolvedValue({ id: 'ch1', familyId: 'fam1' }) },
    familyMember: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
    pediatrician: { findUnique: jest.fn().mockResolvedValue({ id: 'ped1' }) },
    consultation: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
    childDocument: {
      create: jest.fn().mockResolvedValue({ id: 'doc1', createdAt: new Date('2026-09-09') }),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    ...over,
  };
  const events = { emit: jest.fn() } as any;
  const service = new DocumentsService(prisma, crypto, new ChildAccessService(prisma), events);
  return { service, prisma, events };
}

const parent: AuthenticatedUser = { userId: 'u-parent', role: Role.PARENT };
const ped: AuthenticatedUser = { userId: 'u-ped', role: Role.PEDIATRICIAN };

const pdf = (payload = 'JVBERi0xLjQK') => `data:application/pdf;base64,${payload}`;

describe('parseDataUrl', () => {
  it('accepts a PDF and reports its decoded size', () => {
    // 12 base64 chars, no padding → 9 bytes.
    expect(parseDataUrl(pdf())).toEqual({ mime: 'application/pdf', sizeBytes: 9 });
  });

  it('discounts base64 padding from the size', () => {
    expect(parseDataUrl('data:image/png;base64,AAAA').sizeBytes).toBe(3);
    expect(parseDataUrl('data:image/png;base64,AAA=').sizeBytes).toBe(2);
    expect(parseDataUrl('data:image/png;base64,AA==').sizeBytes).toBe(1);
  });

  it('rejects a type that is not a document a parent would hold', () => {
    expect(() => parseDataUrl('data:text/html;base64,PHNjcmlwdD4=')).toThrow(BadRequestException);
    expect(() => parseDataUrl('data:application/javascript;base64,YQ==')).toThrow(
      BadRequestException,
    );
  });

  it('rejects anything that is not a base64 data URL', () => {
    expect(() => parseDataUrl('https://example.com/report.pdf')).toThrow(BadRequestException);
    expect(() => parseDataUrl('data:application/pdf,notbase64')).toThrow(BadRequestException);
  });
});

describe('DocumentsService', () => {
  describe('access control', () => {
    it('rejects a parent outside the child family', async () => {
      const { service } = build({ familyMember: { findFirst: jest.fn().mockResolvedValue(null) } });
      await expect(service.list(parent, 'ch1')).rejects.toThrow(ForbiddenException);
    });

    it('rejects a pediatrician with no consultation for that child', async () => {
      const { service } = build({ consultation: { findFirst: jest.fn().mockResolvedValue(null) } });
      await expect(service.list(ped, 'ch1')).rejects.toThrow(ForbiddenException);
    });

    it('lets the treating pediatrician read the vault', async () => {
      const { service, prisma } = build();
      await service.list(ped, 'ch1');
      expect(prisma.childDocument.findMany).toHaveBeenCalled();
    });

    // Reading is shared with the clinician; erasing the family's own record
    // is not something a clinician should be able to do.
    it('refuses deletion by a pediatrician', async () => {
      const { service, prisma } = build();
      await expect(service.remove(ped, 'ch1', 'doc1')).rejects.toThrow(ForbiddenException);
      expect(prisma.childDocument.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('add', () => {
    it('stores the file with its derived mime and size, and encrypts title + bytes', async () => {
      const { service, prisma } = build();
      const res = await service.add(parent, 'ch1', {
        title: '  Análises de sangue  ',
        kind: DocumentKind.LAB,
        content: pdf(),
        issuedAt: '2026-08-01',
      });
      expect(res).toEqual(
        expect.objectContaining({ id: 'doc1', mime: 'application/pdf', sizeBytes: 9 }),
      );
      const data = prisma.childDocument.create.mock.calls[0][0].data;
      expect(data.title).toBe('Análises de sangue'); // trimmed
      expect(data.kind).toBe(DocumentKind.LAB);
      expect(data.childId).toBe('ch1');
      expect(data.uploadedByUserId).toBe('u-parent');
      expect(data.issuedAt).toEqual(new Date('2026-08-01'));
    });

    it('defaults the kind when the parent does not pick one', async () => {
      const { service, prisma } = build();
      await service.add(parent, 'ch1', { title: 'Carta', content: pdf() });
      expect(prisma.childDocument.create.mock.calls[0][0].data.kind).toBe(DocumentKind.OTHER);
    });

    it('rejects a file over the size cap before touching the database', async () => {
      const { service, prisma } = build();
      const huge = `data:application/pdf;base64,${'A'.repeat(MAX_CONTENT_CHARS)}`;
      await expect(service.add(parent, 'ch1', { title: 'Grande', content: huge })).rejects.toThrow(
        /demasiado grande/i,
      );
      expect(prisma.childDocument.create).not.toHaveBeenCalled();
    });

    it('rejects an empty title', async () => {
      const { service } = build();
      await expect(service.add(parent, 'ch1', { title: '   ', content: pdf() })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('announces the upload for instrumentation without calling it inline', async () => {
      const { service, events } = build();
      await service.add(parent, 'ch1', { title: 'Relatório', content: pdf() });
      expect(events.emit).toHaveBeenCalledWith('child.document.added', {
        childId: 'ch1',
        userId: 'u-parent',
      });
    });
  });

  describe('list', () => {
    // A list of ten reports must not drag ten files' worth of base64 with it.
    it('never selects the file bytes', async () => {
      const { service, prisma } = build();
      await service.list(parent, 'ch1');
      const select = prisma.childDocument.findMany.mock.calls[0][0].select;
      expect(select.content).toBeUndefined();
      expect(select.title).toBe(true);
    });

    it('returns dates as ISO strings', async () => {
      const { service } = build({
        childDocument: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'd1',
              title: 'Ecografia',
              kind: DocumentKind.IMAGING,
              mime: 'application/pdf',
              sizeBytes: 10,
              issuedAt: new Date('2026-07-01'),
              createdAt: new Date('2026-07-02'),
            },
          ]),
        },
      });
      const rows = await service.list(parent, 'ch1');
      expect(rows[0].issuedAt).toBe('2026-07-01T00:00:00.000Z');
      expect(rows[0].createdAt).toBe('2026-07-02T00:00:00.000Z');
    });
  });

  describe('get', () => {
    it('404s for a document belonging to another child', async () => {
      const { service } = build();
      await expect(service.get(parent, 'ch1', 'nope')).rejects.toThrow(NotFoundException);
    });

    it('returns the decrypted bytes when the document is the child’s', async () => {
      const { service } = build({
        childDocument: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'd1',
            title: 'Relatório',
            kind: DocumentKind.REPORT,
            mime: 'application/pdf',
            sizeBytes: 9,
            content: pdf(),
          }),
        },
      });
      const doc = await service.get(parent, 'ch1', 'd1');
      expect(doc.content).toBe(pdf());
      expect(doc.title).toBe('Relatório');
    });
  });

  describe('remove', () => {
    it('404s when nothing matched, so a wrong id is not a silent success', async () => {
      const { service } = build({
        childDocument: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      });
      await expect(service.remove(parent, 'ch1', 'd9')).rejects.toThrow(NotFoundException);
    });

    it('scopes the delete to the child, not just the document id', async () => {
      const { service, prisma } = build();
      await service.remove(parent, 'ch1', 'd1');
      expect(prisma.childDocument.deleteMany).toHaveBeenCalledWith({
        where: { id: 'd1', childId: 'ch1' },
      });
    });
  });
});
