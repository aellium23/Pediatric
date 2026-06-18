import { Body, Controller, Get, Module, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ConsultationsService } from './consultations.service';
import { StartConsultationDto, SendMessageDto } from './dto/consultations.dto';
import { CurrentUser, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';

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
}

@Module({
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
