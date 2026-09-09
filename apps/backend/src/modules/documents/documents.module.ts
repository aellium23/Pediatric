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
import { AiModule } from '../ai/ai.module';
import { AiService, DocumentReading } from '../ai/ai.module';

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

/**
 * Per-family storage ceiling. The vault keeps files inline in Postgres, so an
 * unbounded vault is an availability bug: at 20 uploads/min a single family
 * could fill a free-tier database in an afternoon. Counted per FAMILY and not
 * per child, so adding children does not multiply the allowance.
 *
 * Measured on the decoded file size, which is what a parent sees; on disk it
 * costs roughly 1.4x more once base64 and encryption are added.
 */
export const MAX_FAMILY_BYTES = Number(process.env.VAULT_FAMILY_BYTES ?? 25 * 1024 * 1024);
export const MAX_FAMILY_DOCS = Number(process.env.VAULT_FAMILY_DOCS ?? 100);

/**
 * File signatures ("magic bytes"). The data URL's own mime label is chosen by
 * the client, so on its own it proves nothing: a payload can claim to be a PDF.
 * Since a document uploaded by a family is later opened in a PEDIATRICIAN's
 * browser, the bytes have to actually be what they claim.
 */
const SIGNATURES: { mime: string; test: (b: Buffer) => boolean }[] = [
  { mime: 'application/pdf', test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  { mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/webp',
    test: (b) =>
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  {
    // ISO-BMFF container; HEIC brands live at bytes 8..12.
    mime: 'image/heic',
    test: (b) =>
      b.subarray(4, 8).toString('latin1') === 'ftyp' &&
      ['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1'].includes(
        b.subarray(8, 12).toString('latin1'),
      ),
  },
];

/** The type the bytes really are, or undefined if we do not recognise them. */
export function sniffMime(base64Head: string): string | undefined {
  let head: Buffer;
  try {
    // 64 base64 chars is a multiple of 4 and decodes to 48 bytes — more than
    // any signature above needs.
    head = Buffer.from(base64Head.slice(0, 64), 'base64');
  } catch {
    return undefined;
  }
  return SIGNATURES.find((s) => s.test(head))?.mime;
}

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

/**
 * `data:<mime>;base64,<payload>` → the parts we are willing to store. The mime
 * that comes back is the one the BYTES prove, not the one the client declared.
 */
export function parseDataUrl(content: string): { mime: string; sizeBytes: number } {
  const match = /^data:([a-z0-9.+/-]+);base64,(.+)$/i.exec(content);
  if (!match) throw new BadRequestException('Ficheiro inválido.');
  const declared = match[1].toLowerCase();
  if (!(ALLOWED_MIME as readonly string[]).includes(declared)) {
    throw new BadRequestException('Formato não suportado. Usa PDF ou uma imagem.');
  }

  const b64 = match[2];
  const actual = sniffMime(b64);
  if (!actual) {
    throw new BadRequestException('Ficheiro não reconhecido. Usa um PDF ou uma imagem.');
  }
  if (actual !== declared) {
    // A file whose label disagrees with its content is either broken or hostile;
    // either way it is not going into a pediatrician's browser.
    throw new BadRequestException('O ficheiro não corresponde ao formato indicado.');
  }

  // base64 → bytes, minus the padding.
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return { mime: actual, sizeBytes: Math.floor((b64.length * 3) / 4) - padding };
}

/** Human-readable size. Rounding straight to MB would print "0 MB" for any
 *  limit below a megabyte, which is what an operator sees while tuning one. */
export function humanBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${bytes} bytes`;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
    private readonly access: ChildAccessService,
    private readonly events: EventEmitter2,
    private readonly ai: AiService,
  ) {}

  /**
   * Ask the model to read a document and PROPOSE record entries.
   *
   * Returns candidates only — this writes nothing. The parent reviews them and
   * confirms through the ordinary health-record endpoints, which is where the
   * existing validation and audit already live. A model reading a scan is not
   * a clinical source of truth, and treating it as one is the failure mode this
   * design exists to prevent.
   */
  async read(user: AuthenticatedUser, childId: string, id: string): Promise<DocumentReading | null> {
    const doc = await this.get(user, childId, id);
    const parsed = /^data:([a-z0-9.+/-]+);base64,(.+)$/i.exec(doc.content);
    if (!parsed) throw new BadRequestException('Documento ilegível.');
    return this.ai.readDocument({ mime: parsed[1].toLowerCase(), base64: parsed[2], title: doc.title });
  }

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

  /** Access check that also hands back the child (and so the family). */
  assertParent(user: AuthenticatedUser, childId: string) {
    return this.access.assertAccess(user, childId);
  }

  /** How much of the family's allowance is already spent. */
  async usage(familyId: string): Promise<{ bytes: number; docs: number }> {
    const agg = await this.prisma.childDocument.aggregate({
      where: { child: { familyId } },
      _sum: { sizeBytes: true },
      _count: { _all: true },
    });
    return { bytes: agg._sum.sizeBytes ?? 0, docs: agg._count._all };
  }

  async add(user: AuthenticatedUser, childId: string, dto: AddDocumentDto) {
    const child = await this.access.assertAccess(user, childId);
    if (dto.content.length > MAX_CONTENT_CHARS) {
      throw new BadRequestException(
        'Ficheiro demasiado grande. O limite é cerca de 3 MB por documento.',
      );
    }
    const { mime, sizeBytes } = parseDataUrl(dto.content);
    const title = dto.title.trim();
    if (!title) throw new BadRequestException('Dá um nome ao documento.');

    // Checked after parsing (so we know the real size) and before writing.
    const used = await this.usage(child.familyId);
    if (used.docs + 1 > MAX_FAMILY_DOCS) {
      throw new BadRequestException(
        `Atingiste o limite de ${MAX_FAMILY_DOCS} documentos. Apaga algum para guardar outro.`,
      );
    }
    if (used.bytes + sizeBytes > MAX_FAMILY_BYTES) {
      throw new BadRequestException(
        `Não há espaço: o cofre da família está limitado a ${humanBytes(MAX_FAMILY_BYTES)}. ` +
          'Apaga documentos antigos para libertar espaço.',
      );
    }

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

/** The family's remaining allowance — so the UI can warn before a refusal. */
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

  /** Remaining allowance, so the app can warn before an upload is refused. */
  @Get(':childId/quota')
  @Roles(Role.PARENT)
  async quota(@CurrentUser() user: AuthenticatedUser, @Param('childId') childId: string) {
    const child = await this.service.assertParent(user, childId);
    const used = await this.service.usage(child.familyId);
    return {
      usedBytes: used.bytes,
      maxBytes: MAX_FAMILY_BYTES,
      usedDocs: used.docs,
      maxDocs: MAX_FAMILY_DOCS,
    };
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

  /**
   * Read a document with the model. A separate, deliberate action: this is the
   * moment a clinical document leaves for a third-party processor, so it is the
   * parent's choice and not a side effect of uploading. Also the most expensive
   * call in the product — a whole PDF — hence the tight limit.
   */
  @Post(':childId/:id/read')
  @Roles(Role.PARENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  read(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
    @Param('id') id: string,
  ) {
    return this.service.read(user, childId, id);
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
  imports: [AiModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
