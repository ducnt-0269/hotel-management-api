import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookingRequest } from '../booking-requests/entities/booking-request.entity.js';
import { StripeModule } from '../stripe/stripe.module.js';
import { PaymentSession } from './entities/payment-session.entity.js';
import { PaymentSessionExpiration } from './expiration/entities/payment-session-expiration.entity.js';
import { PaymentSessionExpirationService } from './expiration/payment-session-expiration.service.js';
import { PaymentSessionStripeWebhookController } from './payment-session-stripe-webhook.controller.js';
import { PaymentSessionStripeWebhookService } from './payment-session-stripe-webhook.service.js';
import { PaymentSessionsController } from './payment-sessions.controller.js';
import { PaymentSessionsService } from './payment-sessions.service.js';
import { Payment } from './payment/entities/payment.entity.js';
import { PaymentSessionPaymentService } from './payment/payment-session-payment.service.js';

@Module({
  imports: [
    StripeModule,
    TypeOrmModule.forFeature([
      BookingRequest,
      Payment,
      PaymentSession,
      PaymentSessionExpiration,
    ]),
  ],
  controllers: [
    PaymentSessionsController,
    PaymentSessionStripeWebhookController,
  ],
  providers: [
    PaymentSessionsService,
    PaymentSessionPaymentService,
    PaymentSessionExpirationService,
    PaymentSessionStripeWebhookService,
  ],
})
export class PaymentSessionsModule {}
