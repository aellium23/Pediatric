import { Module } from '@nestjs/common';
import { PediatriciansController } from './pediatricians.controller';
import { PediatriciansService } from './pediatricians.service';
import { ReviewsService } from './reviews.service';
import { FavoritesService } from './favorites.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [PediatriciansController],
  providers: [PediatriciansService, ReviewsService, FavoritesService],
  exports: [PediatriciansService, ReviewsService],
})
export class PediatriciansModule {}
