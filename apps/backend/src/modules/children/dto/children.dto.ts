import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateChildDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '2025-10-01' })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sex?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  usualDoctor?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  allergies?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  medications?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  conditions?: string[];

  @ApiProperty({ description: 'Explicit parental consent for health data', example: true })
  @IsBoolean()
  healthDataConsent!: boolean;
}

export class SetChildPhotoDto {
  // Client resizes to ≤256px; data URL or https (S3) accepted.
  @ApiProperty() @IsString() @MaxLength(300_000) photoUrl!: string;
}
