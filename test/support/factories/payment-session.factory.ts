import { randomUUID } from 'node:crypto';

import { DateTime } from 'luxon';
import { DataSource } from 'typeorm';

import { PaymentSession } from '../../../src/payment-sessions/entities/payment-session.entity.js';
import { Payment } from '../../../src/payment-sessions/payment/entities/payment.entity.js';

import type { BookingRequest } from '../../../src/booking-requests/entities/booking-request.entity.js';
import type { PaymentSessionStatus } from '../../../src/payment-sessions/entities/payment-session.entity.js';
import type { INestApplication } from '@nestjs/common';

export interface PaymentSessionAttributes {
  bookingRequest: BookingRequest;
  status?: PaymentSessionStatus;
  expiresAt?: Date;
}

// Stages a session without a Stripe round trip; the request's amount must be
// above zero.
export async function createPaymentSession(
  app: INestApplication,
  attributes: PaymentSessionAttributes,
): Promise<PaymentSession> {
  const stripeSessionId = `cs_test_${randomUUID()}`;
  return app
    .get(DataSource)
    .getRepository(PaymentSession)
    .save({
      bookingRequestId: attributes.bookingRequest.id,
      stripeSessionId,
      url: `https://checkout.stripe.com/c/pay/${stripeSessionId}`,
      amount: attributes.bookingRequest.totalAmount,
      expiresAt:
        attributes.expiresAt ?? DateTime.now().plus({ days: 1 }).toJSDate(),
      status: attributes.status ?? 'open',
    });
}

// The session passed in should already be completed.
export async function createPayment(
  app: INestApplication,
  attributes: { paymentSession: PaymentSession; paidAt?: Date },
): Promise<Payment> {
  const { paymentSession } = attributes;
  return app
    .get(DataSource)
    .getRepository(Payment)
    .save({
      paymentSessionId: paymentSession.id,
      bookingRequestId: paymentSession.bookingRequestId,
      amount: paymentSession.amount,
      paidAt: attributes.paidAt ?? new Date(),
    });
}
