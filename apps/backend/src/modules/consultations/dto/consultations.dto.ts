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
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  body!: string;
}
