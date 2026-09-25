import type Stripe from 'stripe';

// Integer VND throughout the app; zero-decimal for Stripe.
export const CURRENCY = 'vnd';
// Cards settle at once, so a session only ever completes or expires.
export const PAYMENT_METHODS: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
  ['card'];
// One line; the amount already covers every room and night.
export const SINGLE_CHARGE_QUANTITY = 1;
