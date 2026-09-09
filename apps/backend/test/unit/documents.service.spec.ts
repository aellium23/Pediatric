import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocumentKind, Role } from '@prisma/client';
import {
  DocumentsService,
  MAX_CONTENT_CHARS,
  MAX_FAMILY_BYTES,
  MAX_FAMILY_DOCS,
  humanBytes,
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
      aggregate: jest.fn().mockResolvedValue({ _sum: { sizeBytes: 0 }, _count: { _all: 0 } }),
    },
    ...over,
  };
  const events = { emit: jest.fn() } as any;
  const service = new DocumentsService(prisma, crypto, new ChildAccessService(prisma), events);
  return { service, prisma, events };
}

const parent: AuthenticatedUser = { userId: 'u-parent', role: Role.PARENT };
const ped: AuthenticatedUser = { userId: 'u-ped', role: Role.PEDIATRICIAN };

// Real file signatures — the point of the checks below is that the bytes have
// to be what the label says.
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const dataUrl = (mime: string, buf: Buffer) => `data:${mime};base64,${buf.toString('base64')}`;
const png = (extra = 0) => Buffer.concat([PNG_SIG, Buffer.alloc(extra, 1)]);
const pdfBuf = (extra = 0) =>
  Buffer.concat([Buffer.from('%PDF-1.4\n', 'latin1'), Buffer.alloc(extra, 1)]);
const pdf = (extra = 0) => dataUrl('application/pdf', pdfBuf(extra));

describe('humanBytes', () => {
  // Rounding straight to MB printed "0 MB" for a sub-megabyte limit, which is
  // exactly the range an operator uses while tuning the quota.
  it('does not collapse small sizes to 0 MB', () => {
    expect(humanBytes(50)).toBe('50 bytes');
    expect(humanBytes(500 * 1024)).toBe('500 kB');
    expect(humanBytes(25 * 1024 * 1024)).toBe('25 MB');
  });
});

describe('parseDataUrl', () => {
  it('accepts a PDF and reports its decoded size', () => {
    expect(parseDataUrl(pdf())).toEqual({
      mime: 'application/pdf',
      sizeBytes: pdfBuf().length,
    });
  });

  // Covers all three base64 padding cases (0, 1 and 2 '=' characters).
  it('discounts base64 padding from the size', () => {
    for (const extra of [0, 1, 2]) {
      const buf = png(extra);
      expect(parseDataUrl(dataUrl('image/png', buf)).sizeBytes).toBe(buf.length);
    }
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

  // The declared mime comes from the client and proves nothing. These files end
  // up open in a pediatrician's browser, so the bytes decide.
  it('rejects a payload wearing a PDF label', () => {
    const html = Buffer.from('<script>alert(1)</script>', 'latin1');
    expect(() => parseDataUrl(dataUrl('application/pdf', html))).toThrow(
      /não foi reconhecido|não reconhecido/i,
    );
  });

  it('rejects a real PNG that claims to be a PDF', () => {
    expect(() => parseDataUrl(dataUrl('application/pdf', png(8)))).toThrow(/não corresponde/i);
  });

  it('reports the type the bytes prove, not the one declared', () => {
    expect(parseDataUrl(dataUrl('image/png', png(8))).mime).toBe('image/png');
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

  describe('family quota', () => {
    const full = (over: { bytes?: number; docs?: number }) =>
      build({
        childDocument: {
          create: jest.fn().mockResolvedValue({ id: 'doc1', createdAt: new Date() }),
          aggregate: jest.fn().mockResolvedValue({
            _sum: { sizeBytes: over.bytes ?? 0 },
            _count: { _all: over.docs ?? 0 },
          }),
        },
      });

    // Counted per family, not per child: otherwise adding a child would buy
    // another allowance.
    it('measures usage across the whole family', async () => {
      const { service, prisma } = build();
      await service.add(parent, 'ch1', { title: 'Relatório', content: pdf() });
      expect(prisma.childDocument.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { child: { familyId: 'fam1' } } }),
      );
    });

    it('refuses when the byte allowance is spent, and says how to free space', async () => {
      const { service, prisma } = full({ bytes: MAX_FAMILY_BYTES });
      await expect(
        service.add(parent, 'ch1', { title: 'Mais um', content: pdf() }),
      ).rejects.toThrow(/não há espaço/i);
      expect(prisma.childDocument.create).not.toHaveBeenCalled();
    });

    it('refuses when the document count is spent', async () => {
      const { service, prisma } = full({ docs: MAX_FAMILY_DOCS });
      await expect(
        service.add(parent, 'ch1', { title: 'Mais um', content: pdf() }),
      ).rejects.toThrow(new RegExp(`limite de ${MAX_FAMILY_DOCS} documentos`, 'i'));
      expect(prisma.childDocument.create).not.toHaveBeenCalled();
    });

    it('still accepts the document that exactly fills the allowance', async () => {
      const size = pdfBuf().length;
      const { service, prisma } = full({ bytes: MAX_FAMILY_BYTES - size, docs: MAX_FAMILY_DOCS - 1 });
      await service.add(parent, 'ch1', { title: 'O último', content: pdf() });
      expect(prisma.childDocument.create).toHaveBeenCalled();
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
