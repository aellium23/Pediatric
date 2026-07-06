import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class SetAvailabilityDto {
  @ApiPropertyOptional({
    enum: ['VIDEO', 'MESSAGES'],
    description: 'VIDEO = bookable slots (default); MESSAGES = message hours (reply expectation)',
  })
  @IsOptional()
  @IsIn(['VIDEO', 'MESSAGES'])
  kind?: 'VIDEO' | 'MESSAGES';

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

export class UpdateAvailabilityDto {
  @ApiProperty({ description: 'Minutes from midnight (wall-clock in the pediatrician timezone)' })
  @IsInt()
  @Min(0)
  @Max(1440)
  startMinute!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(1440)
  endMinute!: number;

  @ApiPropertyOptional({
    enum: ['VIDEO', 'MESSAGES'],
    description: 'Change the block kind. VIDEO→MESSAGES removes the whole bookable window.',
  })
  @IsOptional()
  @IsIn(['VIDEO', 'MESSAGES'])
  kind?: 'VIDEO' | 'MESSAGES';

  @ApiPropertyOptional({
    enum: ['all', 'day'],
    description:
      "Recurring blocks only: 'all' edits the weekly template; 'day' materializes a single date.",
  })
  @IsOptional()
  @IsIn(['all', 'day'])
  scope?: 'all' | 'day';

  @ApiPropertyOptional({
    example: '2026-07-13',
    description: "Required with scope='day' on a recurring block: the concrete date to edit.",
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description:
      'Set true to confirm an edit that cancels (and refunds) already-booked consultations.',
  })
  @IsOptional()
  @IsBoolean()
  confirm?: boolean;
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
