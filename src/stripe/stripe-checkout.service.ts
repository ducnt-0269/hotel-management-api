import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import Stripe from 'stripe';

import { EnvService } from '../config/env.service.js';

// Integer VND throughout the app; zero-decimal for Stripe.
const CURRENCY = 'vnd';
// Cards settle at once, so a session only ever completes or expires.
const PAYMENT_METHODS: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
  ['card'];
// One line; the amount already covers every room and night.
const SINGLE_CHARGE_QUANTITY = 1;

export interface CheckoutRequest {
  amount: number;
  description: string;
  metadata: Record<string, string>;
}

export interface CheckoutSession {
  id: string;
  url: string;
  expiresAt: Date;
}

// Keeps Stripe's request shapes and keys out of the callers.
@Injectable()
export class StripeCheckoutService {
  private readonly logger = new Logger(StripeCheckoutService.name);

  constructor(
    private readonly stripe: Stripe,
    private readonly envService: EnvService,
  ) {}

  // Sandbox test cards (any future expiry, any CVC):
  //   4242 4242 4242 4242  paid → checkout.session.completed
  //   4000 0000 0000 0002  declined; the session stays open, no event
  //   4000 0027 6000 3184  asks for 3D Secure; Complete pays, Fail declines
  async createSession({
    amount,
    description,
    metadata,
  }: CheckoutRequest): Promise<CheckoutSession> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        // One-off, not a subscription.
        mode: 'payment',
        payment_method_types: PAYMENT_METHODS,
        line_items: [
          {
            quantity: SINGLE_CHARGE_QUANTITY,
            price_data: {
              currency: CURRENCY,
              unit_amount: amount,
              product_data: { name: description },
            },
          },
        ],
        metadata,
        success_url: this.envService.get('PAYMENT_SUCCESS_URL'),
        cancel_url: this.envService.get('PAYMENT_CANCEL_URL'),
      });
      return {
        id: session.id,
        // Always set for a hosted-page session.
        url: session.url!,
        expiresAt: DateTime.fromSeconds(session.expires_at).toJSDate(),
      };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        this.logger.error('Could not create a Stripe checkout session', error);
        throw new BadGatewayException('Payment provider unavailable');
      }
      throw error;
    }
  }

  // The signature covers the exact bytes received, hence the raw body.
  verifyEvent(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        rawBody ?? '',
        signature ?? '',
        this.envService.get('STRIPE_WEBHOOK_SECRET'),
      );
    } catch {
      throw new BadRequestException('Invalid Stripe signature');
    }
  }
}
