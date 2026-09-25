import { Module } from '@nestjs/common';
import Stripe from 'stripe';

import { EnvService } from '../config/env.service.js';
import { StripeCheckoutService } from './stripe-checkout.service.js';

// e2e and CI point the client at stripe-mock through STRIPE_API_*; without
// them it talks to api.stripe.com.
@Module({
  providers: [
    {
      provide: Stripe,
      inject: [EnvService],
      useFactory: (envService: EnvService) =>
        new Stripe(envService.get('STRIPE_SECRET_KEY'), {
          host: envService.get('STRIPE_API_HOST'),
          port: envService.get('STRIPE_API_PORT'),
          protocol: envService.get('STRIPE_API_PROTOCOL'),
        }),
    },
    StripeCheckoutService,
  ],
  exports: [StripeCheckoutService],
})
export class StripeModule {}
