import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from 'throttler';
import { DocumentKind, Role } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { ChildAccessService } from '../../common/security/child-access.service';
import { CurrentUser, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';

/** What a parent can actually photograph or download from a portal. */
const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;

/**
 * Data-URL length cap. ~4 MB of base64 ≈ 3 MB of file, which sits under the
 * 6 MB body limit even once the JSON envelope is added. A parent photographing
 * a report on a phone lands well inside it.
 */
export const MAX_CONTENT_CHARS = 4_000_000;

export class AddDocumentDto {
  @ApiProperty({ description: 'What the parent will recognise it by.' })
  @IsString()
  @MaxLength(140)
  title!: string;

  @ApiProperty({ enum: DocumentKind, required: false })
  @IsOptional()
  @IsEnum(DocumentKind)
  kind?: DocumentKind;

  @ApiProperty({ description: 'data: URL of the file.' })
  @IsString()
  content!: string;

  @ApiProperty({ required: false, description: 'Date on the document itself.' })
  @IsOptional()
  @IsISO8601()
  issuedAt?: string;
}

/** A vault document without its bytes — what a list needs. */
export interface DocumentSummary {
  id: string;
  title: string;
  kind: DocumentKind;
  mime: string;
  sizeBytes: number;
  issuedAt: string | null;
  createdAt: string;
}

/** `data:<mime>;base64,<payload>` → the parts we are willing to store. */
export function parseDataUrl(content: string): { mime: string; sizeBytes: number } {
  const match = /^data:([a-z0-9.+/-]+);base64,(.+)$/i.exec(content);
  if (!match) throw new BadRequestException('Ficheiro inválido.');
  const mime = match[1].toLowerCase();
  if (!(ALLOWED_MIME as readonly string[]).includes(mime)) {
    throw new BadRequestException('Formato não suportado. Usa PDF ou uma imagem.');
  }
  // base64 → bytes, minus the padding.
  const b64 = match[2];
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return { mime, sizeBytes: Math.floor((b64.length * 3) / 4) - padding };
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
    private readonly access: ChildAccessService,
    private readonly events: EventEmitter2,
  ) {}

  /** Metadata only — never ship megabytes of base64 to render a list. */
  async list(user: AuthenticatedUser, childId: string): Promise<DocumentSummary[]> {
    await this.access.assertAccess(user, childId);
    const rows = await this.prisma.childDocument.findMany({
      where: { childId },
      select: {
        id: true,
        title: true,
        kind: true,
        mime: true,
        sizeBytes: true,
        issuedAt: true,
        createdAt: true,
      },
      orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => ({
      ...r,
      title: this.crypto.decryptSafe(r.title) ?? '',
      issuedAt: r.issuedAt ? r.issuedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** The bytes, fetched only when the parent actually opens the document. */
  async get(user: AuthenticatedUser, childId: string, id: string) {
    await this.access.assertAccess(user, childId);
    const doc = await this.prisma.childDocument.findFirst({ where: { id, childId } });
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    return {
      id: doc.id,
      title: this.crypto.decryptSafe(doc.title) ?? '',
      kind: doc.kind,
      mime: doc.mime,
      sizeBytes: doc.sizeBytes,
      content: this.crypto.decryptSafe(doc.content) ?? '',
    };
  }

  async add(user: AuthenticatedUser, childId: string, dto: AddDocumentDto) {
    await this.access.assertAccess(user, childId);
    if (dto.content.length > MAX_CONTENT_CHARS) {
      throw new BadRequestException(
        'Ficheiro demasiado grande. O limite é cerca de 3 MB por documento.',
      );
    }
    const { mime, sizeBytes } = parseDataUrl(dto.content);
    const title = dto.title.trim();
    if (!title) throw new BadRequestException('Dá um nome ao documento.');

    const doc = await this.prisma.childDocument.create({
      data: {
        childId,
        uploadedByUserId: user.userId,
        // Title and bytes are both special-category health data.
        title: this.crypto.encrypt(title) as string,
        kind: dto.kind ?? DocumentKind.OTHER,
        mime,
        sizeBytes,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
        content: this.crypto.encrypt(dto.content) as string,
      },
      select: { id: true, createdAt: true },
    });

    // Instrumentation listens for this; it is never in this call chain.
    this.events.emit('child.document.added', { childId, userId: user.userId });
    return { id: doc.id, createdAt: doc.createdAt.toISOString(), mime, sizeBytes };
  }

  async remove(user: AuthenticatedUser, childId: string, id: string) {
    const child = await this.access.assertAccess(user, childId);
    // Reading is shared with the treating pediatrician; deleting is the
    // family's alone — a clinician must not be able to erase a family's record.
    if (user.role !== Role.PARENT) {
      throw new ForbiddenException('Só a família pode apagar documentos.');
    }
    void child;
    const { count } = await this.prisma.childDocument.deleteMany({ where: { id, childId } });
    if (!count) throw new NotFoundException('Documento não encontrado.');
    return { ok: true };
  }
}

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get(':childId')
  @Roles(Role.PARENT, Role.PEDIATRICIAN)
  list(@CurrentUser() user: AuthenticatedUser, @Param('childId') childId: string) {
    return this.service.list(user, childId);
  }

  @Get(':childId/:id')
  @Roles(Role.PARENT, Role.PEDIATRICIAN)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
    @Param('id') id: string,
  ) {
    return this.service.get(user, childId, id);
  }

  // Multi-megabyte writes — kept well below the generic bucket.
  @Post(':childId')
  @Roles(Role.PARENT)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
    @Body() dto: AddDocumentDto,
  ) {
    return this.service.add(user, childId, dto);
  }

  @Post(':childId/:id/remove')
  @Roles(Role.PARENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(user, childId, id);
  }
}

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
