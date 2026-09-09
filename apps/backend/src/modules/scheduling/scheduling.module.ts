import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SchedulingService } from './scheduling.service';
import {
  SetAvailabilityDto,
  UpdateAvailabilityDto,
  BookVideoDto,
  UnavailabilityDto,
} from './dto/scheduling.dto';
import { CurrentUser, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';
import { PaymentsModule } from '../payments/payments.module';

@ApiTags('scheduling')
@ApiBearerAuth()
@Controller('scheduling')
class SchedulingController {
  constructor(private readonly service: SchedulingService) {}

  @Post('availability')
  @Roles(Role.PEDIATRICIAN)
  setAvailability(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetAvailabilityDto) {
    return this.service.setAvailability(user.userId, dto);
  }

  @Get('availability/me')
  @Roles(Role.PEDIATRICIAN)
  myAvailability(@CurrentUser() user: AuthenticatedUser) {
    return this.service.myAvailability(user.userId);
  }

  @Delete('availability/:id')
  @Roles(Role.PEDIATRICIAN)
  deleteAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('confirm') confirm?: string,
  ) {
    return this.service.deleteAvailability(user.userId, id, confirm === 'true');
  }

  @Patch('availability/:id')
  @Roles(Role.PEDIATRICIAN)
  updateAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.service.updateAvailability(user.userId, id, dto);
  }

  @Get('my-bookings')
  @Roles(Role.PEDIATRICIAN)
  myBookings(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.myBookings(user.userId, from, to);
  }

  @Post('unavailability')
  @Roles(Role.PEDIATRICIAN)
  markUnavailable(@CurrentUser() user: AuthenticatedUser, @Body() dto: UnavailabilityDto) {
    return this.service.markUnavailable(user.userId, dto);
  }

  @Get('pediatricians/:id/slots')
  @Roles(Role.PARENT)
  slots(@Param('id') id: string, @Query('date') date: string) {
    return this.service.slots(id, date);
  }

  @Get('pediatricians/:id/next-slots')
  @Roles(Role.PARENT)
  nextSlots(@Param('id') id: string, @Query('days') days?: string) {
    return this.service.nextSlots(id, days ? Number(days) : 10);
  }

  @Post('book')
  @Roles(Role.PARENT)
  book(@CurrentUser() user: AuthenticatedUser, @Body() dto: BookVideoDto) {
    return this.service.book(user.userId, dto);
  }
}

@Module({
  imports: [PaymentsModule],
  controllers: [SchedulingController],
  providers: [SchedulingService],
})
export class SchedulingModule {}
