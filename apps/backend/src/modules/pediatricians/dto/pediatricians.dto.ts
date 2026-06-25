import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ServiceType } from '@prisma/client';

export class MarketplaceQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specialty?: string;
  @ApiPropertyOptional({ enum: ServiceType })
  @IsOptional()
  type?: ServiceType;

  @ApiPropertyOptional({ description: 'Max price in cents' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceCents?: number;

  @ApiPropertyOptional({ description: 'Minimum average rating' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(5)
  minRating?: number;
}

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) experienceYears?: number;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  languages?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  specialties?: string[];
}

export class CreateServiceDto {
  @ApiProperty({ enum: ServiceType }) @IsEnum(ServiceType) type!: ServiceType;
  @ApiProperty() @IsInt() @Min(100) priceCents!: number;
  @ApiProperty() @IsInt() @Min(1) slaHours!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) scopeText?: string;
}

export class UpdateServiceDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(100) priceCents?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) slaHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) scopeText?: string;
}

export class CreateReviewDto {
  @ApiProperty() @IsUUID() consultationId!: string;
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) rating!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}
