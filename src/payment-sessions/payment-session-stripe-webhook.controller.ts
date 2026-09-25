import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator.js';
import { PaymentSessionStripeWebhookService } from './payment-session-stripe-webhook.service.js';

import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

// Public, but only a signed event is acted on. A 5xx makes Stripe retry.
@ApiExcludeController()
@Public()
@Controller('payment-sessions/stripe-webhook')
export class PaymentSessionStripeWebhookController {
  constructor(
    private readonly paymentSessionStripeWebhookService: PaymentSessionStripeWebhookService,
  ) {}

  @Post()
  @HttpCode(204)
  handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<void> {
    return this.paymentSessionStripeWebhookService.handle(
      req.rawBody,
      signature,
    );
  }
}
