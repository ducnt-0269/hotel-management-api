import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

import { StripeCheckoutService } from '../stripe/stripe-checkout.service.js';
import { PaymentSessionExpirationService } from './expiration/payment-session-expiration.service.js';
import { PaymentSessionPaymentService } from './payment/payment-session-payment.service.js';

// Only a signed event gets past `verifyEvent`; other event types are ignored.
@Injectable()
export class PaymentSessionStripeWebhookService {
  constructor(
    private readonly stripeCheckoutService: StripeCheckoutService,
    private readonly paymentSessionPaymentService: PaymentSessionPaymentService,
    private readonly paymentSessionExpirationService: PaymentSessionExpirationService,
  ) {}

  async handle(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Promise<void> {
    const event = this.stripeCheckoutService.verifyEvent(rawBody, signature);

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
