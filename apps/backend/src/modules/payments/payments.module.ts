import {
  Body,
  Controller,
  Headers,
  Module,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { StripeService } from './stripe.service';
import { PaymentsService } from './payments.service';
import { CreateIntentDto } from './dto/payments.dto';
import { CurrentUser, Public, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';

@ApiTags('payments')
@Controller('payments')
class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly stripe: StripeService,
  ) {}

  @ApiBearerAuth()
  @Post('intent')
  @Roles(Role.PARENT)
  createIntent(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateIntentDto) {
    return this.payments.createIntentForConsultation(user.userId, dto.consultationId);
  }

  /** Stripe webhook: verifies signature, then reconciles payment state. */
  @Public()
  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const event = this.stripe.constructEvent(req.rawBody as Buffer, signature);
    await this.payments.handleWebhook(event);
    return { received: true };
  }
}

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeService],
  exports: [PaymentsService, StripeService],
})
export class PaymentsModule {}
