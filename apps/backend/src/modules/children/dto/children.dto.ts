import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
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

export class SetChildSnsDto {
  // SNS/utente number — digits only, encrypted at rest; null clears it.
  @ApiProperty({ required: false, nullable: true, example: '123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  @Matches(/^\d+$/, { message: 'Número de utente inválido.' })
  snsNumber?: string | null;
}

export class SetFamilyRegionDto {
  // Free text accepted; normalized against PT_REGIONS server-side.
  @ApiProperty({ example: 'Lisboa' })
  @IsString()
  @MaxLength(60)
  region!: string;

  // 4-digit PT postal prefix — analytics granularity, never a full address.
  @ApiProperty({ required: false, example: '1000' })
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'Código postal inválido (4 dígitos).' })
  postalCode?: string;
}
