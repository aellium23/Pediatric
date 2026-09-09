import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ContentService } from '../../src/modules/content/content.module';
import { AuthenticatedUser } from '../../src/common/security/jwt.strategy';

function build(over: Record<string, any> = {}) {
  const prisma: any = {
    article: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'a1', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'a1', ...data })),
    },
    ...over,
  };
  return { service: new ContentService(prisma), prisma };
}

const author: AuthenticatedUser = { userId: 'u-author', role: Role.PEDIATRICIAN };
const admin: AuthenticatedUser = { userId: 'u-admin', role: Role.PLATFORM_ADMIN };

describe('ContentService', () => {
  describe('create', () => {
    it('slugifies the title and defaults category/published', async () => {
      const { service, prisma } = build();
      const art = await service.create(author, { title: 'Febre nas Crianças!', body: '...' });
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'febre-nas-criancas',
            category: 'geral',
            published: false,
            authorUserId: 'u-author',
          }),
        }),
      );
      expect(art.id).toBe('a1');
    });

    it('appends a numeric suffix when the slug already exists', async () => {
      // First slug lookup hits an existing article, second is free.
      const findUnique = jest
        .fn()
        .mockResolvedValueOnce({ id: 'existing' })
        .mockResolvedValueOnce(null);
      const { service, prisma } = build({
        article: {
          findUnique,
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'a2', ...data })),
        },
      });
      await service.create(author, { title: 'Sono', body: '...' });
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'sono-2' }) }),
      );
    });
  });

  describe('update authorization', () => {
    it('rejects a non-author non-admin', async () => {
      const { service } = build({
        article: { findUnique: jest.fn().mockResolvedValue({ id: 'a1', authorUserId: 'someone-else' }) },
      });
      await expect(
        service.update(author, 'a1', { title: 'novo' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets a platform admin edit any article', async () => {
      const { service, prisma } = build({
        article: {
          findUnique: jest.fn().mockResolvedValue({ id: 'a1', authorUserId: 'someone-else' }),
          update: jest.fn().mockResolvedValue({ id: 'a1', title: 'novo' }),
        },
      });
      const res = await service.update(admin, 'a1', { title: 'novo' });
      expect(res.title).toBe('novo');
      expect(prisma.article.update).toHaveBeenCalled();
    });

    it('throws when the article does not exist', async () => {
      const { service } = build();
      await expect(service.update(admin, 'missing', {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getPublished', () => {
    it('throws for an unknown or unpublished slug', async () => {
      const { service } = build();
      await expect(service.getPublished('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('review workflow', () => {
    it('pediatrician submitting goes to PENDING_REVIEW, never straight to published', async () => {
      const { service, prisma } = build();
      await service.create(author, { title: 'Sono', body: '...', published: true });
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING_REVIEW', published: false }),
        }),
      );
    });

    it('platform admin submitting publishes directly', async () => {
      const { service, prisma } = build();
      await service.create(admin, { title: 'Sono', body: '...', published: true });
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PUBLISHED', published: true }),
        }),
      );
    });

    it('author editing a live article sends it back through review', async () => {
      const { service, prisma } = build({
        article: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'a1', authorUserId: 'u-author', status: 'PUBLISHED' }),
          update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'a1', ...data })),
        },
      });
      const res = await service.update(author, 'a1', { body: 'texto novo' });
      expect(res.status).toBe('PENDING_REVIEW');
      expect(res.published).toBe(false);
      expect(prisma.article.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING_REVIEW', published: false, reviewNote: null }),
        }),
      );
    });

    it('approve publishes and stamps the reviewer', async () => {
      const { service, prisma } = build({
        article: {
          findUnique: jest.fn().mockResolvedValue({ id: 'a1', status: 'PENDING_REVIEW' }),
          update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'a1', ...data })),
        },
      });
      const res = await service.approve(admin, 'a1');
      expect(res.status).toBe('PUBLISHED');
      expect(res.published).toBe(true);
      expect(prisma.article.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reviewedById: 'u-admin' }),
        }),
      );
    });

    it('reject unpublishes and stores the note', async () => {
      const { service } = build({
        article: {
          findUnique: jest.fn().mockResolvedValue({ id: 'a1', status: 'PENDING_REVIEW' }),
          update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'a1', ...data })),
        },
      });
      const res = await service.reject(admin, 'a1', 'Falta referenciar a fonte.');
      expect(res.status).toBe('REJECTED');
      expect(res.published).toBe(false);
      expect(res.reviewNote).toBe('Falta referenciar a fonte.');
    });

    it('approve/reject throw for a missing article', async () => {
      const { service } = build();
      await expect(service.approve(admin, 'missing')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.reject(admin, 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
