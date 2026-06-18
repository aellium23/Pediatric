import { Module } from '@nestjs/common';
import { PediatriciansController } from './pediatricians.controller';
import { PediatriciansService } from './pediatricians.service';
import { ReviewsService } from './reviews.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [PediatriciansController],
  providers: [PediatriciansService, ReviewsService],
  exports: [PediatriciansService, ReviewsService],
})
export class PediatriciansModule {}
