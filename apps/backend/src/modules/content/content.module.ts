import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ArticleStatus, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrentUser, Public, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

class CreateArticleDto {
  @ApiProperty() @IsString() @MaxLength(200) title!: string;
  @ApiProperty() @IsString() @MaxLength(20000) body!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(60) category?: string;
  // `published: true` means "submit": pediatricians go to review,
  // platform admins publish directly. `false`/absent saves a draft.
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() published?: boolean;
}
class UpdateArticleDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(200) title?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(20000) body?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(60) category?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() published?: boolean;
}
class RejectArticleDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) note?: string;
}

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  listPublished(category?: string) {
    return this.prisma.article.findMany({
      where: { published: true, ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200, // bounded — each row carries the full body (≤20k chars)
      select: { id: true, slug: true, title: true, category: true, body: true, createdAt: true },
    });
  }

  async getPublished(slug: string) {
    const a = await this.prisma.article.findFirst({ where: { slug, published: true } });
    if (!a) throw new NotFoundException('Artigo não encontrado.');
    return a;
  }

  mine(userId: string) {
    return this.prisma.article.findMany({
      where: { authorUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async create(user: AuthenticatedUser, dto: CreateArticleDto) {
    const base = slugify(dto.title) || 'artigo';
    // Ensure unique slug.
    let slug = base;
    let n = 1;
    while (await this.prisma.article.findUnique({ where: { slug } })) {
      slug = `${base}-${++n}`;
    }
    const submit = dto.published ?? false;
    const isAdmin = user.role === Role.PLATFORM_ADMIN;
    const status: ArticleStatus = !submit
      ? ArticleStatus.DRAFT
      : isAdmin
        ? ArticleStatus.PUBLISHED
        : ArticleStatus.PENDING_REVIEW;
    return this.prisma.article.create({
      data: {
        slug,
        title: dto.title,
        body: dto.body,
        category: dto.category ?? 'geral',
        status,
        published: status === ArticleStatus.PUBLISHED,
        authorUserId: user.userId,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateArticleDto) {
    const a = await this.prisma.article.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Artigo não encontrado.');
    const isAdmin = user.role === Role.PLATFORM_ADMIN;
    if (!isAdmin && a.authorUserId !== user.userId) {
      throw new ForbiddenException('Não és o autor.');
    }
    const { published, ...fields } = dto;
    let status = a.status;
    if (published === true) {
      status = isAdmin ? ArticleStatus.PUBLISHED : ArticleStatus.PENDING_REVIEW;
    } else if (published === false) {
      status = ArticleStatus.DRAFT;
    } else if (!isAdmin && a.status === ArticleStatus.PUBLISHED) {
      // Author edited a live article: back through review, off the library.
      status = ArticleStatus.PENDING_REVIEW;
    }
    return this.prisma.article.update({
      where: { id },
      data: {
        ...fields,
        status,
        published: status === ArticleStatus.PUBLISHED,
        ...(status !== a.status ? { reviewNote: null } : {}),
      },
    });
  }

  pendingReview() {
    return this.prisma.article.findMany({
      where: { status: ArticleStatus.PENDING_REVIEW },
      orderBy: { updatedAt: 'asc' },
      take: 200,
    });
  }

  async approve(reviewer: AuthenticatedUser, id: string) {
    const a = await this.prisma.article.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Artigo não encontrado.');
    return this.prisma.article.update({
      where: { id },
      data: {
        status: ArticleStatus.PUBLISHED,
        published: true,
        reviewNote: null,
        reviewedById: reviewer.userId,
        reviewedAt: new Date(),
      },
    });
  }

  async reject(reviewer: AuthenticatedUser, id: string, note?: string) {
    const a = await this.prisma.article.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Artigo não encontrado.');
    return this.prisma.article.update({
      where: { id },
      data: {
        status: ArticleStatus.REJECTED,
        published: false,
        reviewNote: note ?? null,
        reviewedById: reviewer.userId,
        reviewedAt: new Date(),
      },
    });
  }
}

@ApiTags('content')
@Controller('content')
class ContentController {
  constructor(private readonly service: ContentService) {}

  @Public()
  @Get()
  list(@Query('category') category?: string) {
    return this.service.listPublished(category);
  }

  @ApiBearerAuth()
  @Get('mine')
  @Roles(Role.PEDIATRICIAN, Role.PLATFORM_ADMIN)
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.mine(user.userId);
  }

  @ApiBearerAuth()
  @Get('review/pending')
  @Roles(Role.PLATFORM_ADMIN, Role.CLINIC_ADMIN)
  pendingReview() {
    return this.service.pendingReview();
  }

  @ApiBearerAuth()
  @Post(':id/approve')
  @Roles(Role.PLATFORM_ADMIN, Role.CLINIC_ADMIN)
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.approve(user, id);
  }

  @ApiBearerAuth()
  @Post(':id/reject')
  @Roles(Role.PLATFORM_ADMIN, Role.CLINIC_ADMIN)
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectArticleDto,
  ) {
    return this.service.reject(user, id, dto.note);
  }

  @Public()
  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.service.getPublished(slug);
  }

  @ApiBearerAuth()
  @Post()
  @Roles(Role.PEDIATRICIAN, Role.PLATFORM_ADMIN)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateArticleDto) {
    return this.service.create(user, dto);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @Roles(Role.PEDIATRICIAN, Role.PLATFORM_ADMIN)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.service.update(user, id, dto);
  }
}

@Module({
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
