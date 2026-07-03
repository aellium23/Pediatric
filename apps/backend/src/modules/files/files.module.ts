import {
  Body,
  Controller,
  ForbiddenException,
  Injectable,
  Module,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';
import { randomUUID } from 'crypto';
import * as AWS from 'aws-sdk';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrentUser, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';

class PresignUploadDto {
  @ApiProperty() @IsUUID() childId!: string;
  @ApiProperty() @IsString() mime!: string;
  @ApiProperty() @IsString() filename!: string;
}

/**
 * Clinical files are uploaded via short-lived signed URLs to a private,
 * SSE-KMS encrypted bucket. Objects start in a quarantine prefix and are
 * scanned (malware/content) before being marked clean (Increment 2).
 */
@Injectable()
export class FilesService {
  private readonly s3: AWS.S3;
  private readonly bucket: string;
  private readonly kmsKeyId: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.s3 = new AWS.S3({ region: config.get('aws.region'), signatureVersion: 'v4' });
    this.bucket = config.get('aws.bucket')!;
    this.kmsKeyId = config.get('aws.kmsKeyId')!;
  }

  async presignUpload(userId: string, dto: PresignUploadDto) {
    // Authorization: the caller must belong to the child's family (prevents
    // uploading clinical files against another family's child — IDOR).
    const child = await this.prisma.child.findUnique({ where: { id: dto.childId } });
    if (!child) throw new ForbiddenException('Criança não encontrada.');
    const member = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: child.familyId },
    });
    if (!member) throw new ForbiddenException('Sem autorização para esta criança.');

    const key = `quarantine/${dto.childId}/${randomUUID()}-${dto.filename}`;
    const uploadUrl = await this.s3.getSignedUrlPromise('putObject', {
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.mime,
      Expires: 300, // 5 minutes
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: this.kmsKeyId,
    });

    const asset = await this.prisma.fileAsset.create({
      data: {
        ownerUserId: userId,
        childId: dto.childId,
        type: 'document',
        storageKey: key,
        mime: dto.mime,
        sizeBytes: 0,
        scanStatus: 'pending',
      },
    });

    return { fileId: asset.id, uploadUrl, expiresIn: 300 };
  }
}

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('presign')
  @Roles(Role.PARENT)
  presign(@CurrentUser() user: AuthenticatedUser, @Body() dto: PresignUploadDto) {
    return this.files.presignUpload(user.userId, dto);
  }
}

@Module({
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
