import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateIntentDto {
  @ApiProperty()
  @IsUUID()
  consultationId!: string;
}
