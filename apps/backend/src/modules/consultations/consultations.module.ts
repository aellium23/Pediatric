import { Body, Controller, Get, Module, Param, Post } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ConsultationsService } from './consultations.service';
import { ConsultationsGateway } from './consultations.gateway';
import { SlaScheduler } from './sla.scheduler';
import { StartConsultationDto, SendMessageDto } from './dto/consultations.dto';
import { CurrentUser, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';
import { PaymentsModule } from '../payments/payments.module';

@ApiTags('consultations')
@ApiBearerAuth()
@Controller('consultations')
class ConsultationsController {
  constructor(private readonly service: ConsultationsService) {}

  @Post()
  @Roles(Role.PARENT)
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartConsultationDto) {
    return this.service.start(user.userId, dto);
  }

  @Get()
  @Roles(Role.PARENT)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listForParent(user.userId);
  }

  @Get('inbox')
  @Roles(Role.PEDIATRICIAN)
  inbox(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listForPediatrician(user.userId);
  }

  @Get('all')
  @Roles(Role.PLATFORM_ADMIN, Role.FINANCE)
  all() {
    return this.service.listAll();
  }

  @Get(':id/messages')
  @Roles(Role.PARENT, Role.PEDIATRICIAN)
  messages(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getMessages(user.userId, id);
  }

  @Post(':id/messages')
  @Roles(Role.PARENT, Role.PEDIATRICIAN)
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.sendMessage(user.userId, id, dto);
  }

  @Get(':id/summary')
  @Roles(Role.PARENT, Role.PEDIATRICIAN)
  getSummary(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getSummary(user.userId, id);
  }

  @Post(':id/summary')
  @Roles(Role.PEDIATRICIAN)
  setSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('text') text: string,
  ) {
    return this.service.setSummary(user.userId, id, text ?? '');
  }

  @Post(':id/close')
  @Roles(Role.PEDIATRICIAN)
  close(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.close(user.userId, id);
  }

  @Post(':id/cancel')
  @Roles(Role.PARENT)
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.cancel(user.userId, id);
  }

  @Post(':id/refund')
  @Roles(Role.PLATFORM_ADMIN, Role.FINANCE)
  refund(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.service.refundByAdmin(id, reason);
  }
}

@Module({
  imports: [PaymentsModule, JwtModule.register({})],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, ConsultationsGateway, SlaScheduler],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
