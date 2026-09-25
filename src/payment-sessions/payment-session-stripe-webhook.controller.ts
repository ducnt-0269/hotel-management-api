import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { DateTime } from 'luxon';

import { Public } from '../auth/decorators/public.decorator.js';
import { StripeCheckoutService } from '../stripe/stripe-checkout.service.js';
import { PaymentSessionExpirationService } from './expiration/payment-session-expiration.service.js';
import { PaymentSessionPaymentService } from './payment/payment-session-payment.service.js';

import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

// Public, but only a signed event gets past `verifyEvent`. A 5xx makes Stripe
// retry.
@ApiExcludeController()
@Public()
@Controller('payment-sessions/stripe-webhook')
export class PaymentSessionStripeWebhookController {
  constructor(
    private readonly stripeCheckoutService: StripeCheckoutService,
    private readonly paymentSessionPaymentService: PaymentSessionPaymentService,
    private readonly paymentSessionExpirationService: PaymentSessionExpirationService,
  ) {}

  @Post()
  @HttpCode(204)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<void> {
    const event = this.stripeCheckoutService.verifyEvent(
      req.rawBody,
      signature,
    );

    switch (event.type) {
      case 'checkout.session.completed':
        await this.paymentSessionPaymentService.complete(
          event.data.object,
          DateTime.fromSeconds(event.created).toJSDate(),
        );
        break;
      case 'checkout.session.expired':
        await this.paymentSessionExpirationService.expire(event.data.object.id);
        break;
    }
  }
}
