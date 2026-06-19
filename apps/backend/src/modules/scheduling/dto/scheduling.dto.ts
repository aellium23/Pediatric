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
  @ApiProperty({ minimum: 0, maximum: 6, description: '0=Sunday .. 6=Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

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
