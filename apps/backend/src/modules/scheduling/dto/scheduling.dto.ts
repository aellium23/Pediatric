import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class SetAvailabilityDto {
  @ApiPropertyOptional({
    minimum: 0,
    maximum: 6,
    description: '0=Sunday .. 6=Saturday (weekly template; ignored when `date` is set)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;

  @ApiPropertyOptional({
    example: '2026-07-13',
    description: 'Concrete date (YYYY-MM-DD). Dated blocks override the weekly template that day.',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 12,
    description: 'With `date`: create the block for N consecutive weeks (same weekday/time).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  repeatWeeks?: number;

  @ApiProperty({ description: 'Minutes from midnight' })
  @IsInt()
  @Min(0)
  @Max(1440)
  startMinute!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(1440)
  endMinute!: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(5)
  slotMinutes?: number;
}

export class BookVideoDto {
  @ApiProperty() @IsUUID() childId!: string;
  @ApiProperty() @IsUUID() serviceId!: string;
  @ApiProperty({ example: '2026-07-01T14:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ description: 'Informed teleconsultation consent' })
  @IsBoolean()
  teleconsultConsent!: boolean;
}
