import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class StartConsultationDto {
  @ApiProperty()
  @IsUUID()
  childId!: string;

  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  question?: string;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  triage?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  episodeId?: string;
}

export class SendMessageDto {
  @ApiProperty({ required: false, description: 'Optional when attachments are sent.' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;

  // Clinical photos captured on the phone: client-downscaled JPEG data URLs
  // (~1280px long edge). Encrypted at rest like message bodies.
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(600_000, { each: true })
  attachments?: string[];
}

export class SummaryTextDto {
  @ApiProperty()
  @IsString()
  @MaxLength(20000)
  text!: string;
}
