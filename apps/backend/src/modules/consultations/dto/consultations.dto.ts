import { ApiProperty } from '@nestjs/swagger';
import {
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
  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  body!: string;
}

export class SummaryTextDto {
  @ApiProperty()
  @IsString()
  @MaxLength(20000)
  text!: string;
}
