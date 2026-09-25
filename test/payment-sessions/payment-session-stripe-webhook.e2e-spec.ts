import { randomUUID } from 'node:crypto';

import { DateTime } from 'luxon';
import Stripe from 'stripe';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { PaymentSession } from '../../src/payment-sessions/entities/payment-session.entity.js';
import { PaymentSessionExpiration } from '../../src/payment-sessions/expiration/entities/payment-session-expiration.entity.js';
import { Payment } from '../../src/payment-sessions/payment/entities/payment.entity.js';
import { createTestApp } from '../support/create-test-app.js';
import { createBookingRequest } from '../support/factories/booking-request.factory.js';
import { createPaymentSession } from '../support/factories/payment-session.factory.js';
import { createRoomType } from '../support/factories/room-type.factory.js';
import { createUser } from '../support/factories/user.factory.js';
import { resetDb } from '../support/reset-db.js';

import type { INestApplication } from '@nestjs/common';

const stay = { checkInDate: '2030-01-10', checkOutDate: '2030-01-12' };
// When Stripe says the money was taken: 2026-09-26T08:00:00Z.
const PAID_AT = 1_790_409_600;
// Signing needs only the webhook secret; the API key is never used.
const stripe = new Stripe('sk_test_unused');
// Stripe's libraries refuse a signature older than five minutes.
const REPLAY_AGE_SECONDS = 10 * 60;

// Events are built and signed here with the app's secret, as Stripe would.
describe('Stripe webhook (e2e)', () => {
  let app: INestApplication;
  let paymentSession: PaymentSession;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDb(app);
    const bookingRequest = await createBookingRequest(app, {
      user: await createUser(app),
      roomType: await createRoomType(app),
      ...stay,
      status: 'approved',
      totalAmount: '3000000',
    });
    paymentSession = await createPaymentSession(app, { bookingRequest });
  });

  const repository = <T extends object>(entity: new () => T) =>
    app.get(DataSource).getRepository(entity);

  const event = (type: string, object: object) =>
    JSON.stringify({
      id: `evt_${randomUUID()}`,
      object: 'event',
      type,
      created: PAID_AT,
      data: { object },
    });

  const completed = (overrides: object = {}) =>
    event('checkout.session.completed', {
      id: paymentSession.stripeSessionId,
      object: 'checkout.session',
      amount_total: 3_000_000,
      currency: 'vnd',
      payment_status: 'paid',
      status: 'complete',
      ...overrides,
    });

  const expired = () =>
    event('checkout.session.expired', {
      id: paymentSession.stripeSessionId,
      object: 'checkout.session',
      status: 'expired',
    });

  const deliver = (
    payload: string,
    {
      secret = process.env.STRIPE_WEBHOOK_SECRET!,
      timestamp,
    }: { secret?: string; timestamp?: number } = {},
  ) =>
    request(app.getHttpServer())
      .post('/api/payment-sessions/stripe-webhook')
      .set('Content-Type', 'application/json')
      .set(
        'Stripe-Signature',
        stripe.webhooks.generateTestHeaderString({
          payload,
          secret,
          timestamp,
        }),
      )
      .send(payload);

  const storedSession = () =>
    repository(PaymentSession).findOneByOrFail({ id: paymentSession.id });

  describe('checkout.session.completed', () => {
    it('records the payment at Stripe’s time', async () => {
      await deliver(completed()).expect(204);

      const payment = await repository(Payment).findOneByOrFail({
        paymentSessionId: paymentSession.id,
      });
      expect(payment).toMatchObject({
        bookingRequestId: paymentSession.bookingRequestId,
        amount: '3000000',
        paidAt: new Date(PAID_AT * 1000),
      });
      expect((await storedSession()).status).toBe('completed');
    });

    it('records a repeated delivery once', async () => {
      await deliver(completed()).expect(204);
      await deliver(completed()).expect(204);

      expect(await repository(Payment).count()).toBe(1);
    });

    it('records what Stripe took even when it differs from the price', async () => {
      await deliver(completed({ amount_total: 2_900_000 })).expect(204);

      const payment = await repository(Payment).findOneByOrFail({
        paymentSessionId: paymentSession.id,
      });
      expect(payment.amount).toBe('2900000');
    });

    it('ignores a session it never opened', async () => {
      await deliver(completed({ id: 'cs_test_unknown' })).expect(204);

      expect(await repository(Payment).count()).toBe(0);
      expect((await storedSession()).status).toBe('open');
    });
  });

  describe('checkout.session.expired', () => {
    it('records the expiry', async () => {
      await deliver(expired()).expect(204);

      expect((await storedSession()).status).toBe('expired');
      expect(
        await repository(PaymentSessionExpiration).countBy({
          paymentSessionId: paymentSession.id,
        }),
      ).toBe(1);
    });

    it('records a repeated delivery once', async () => {
      await deliver(expired()).expect(204);
      await deliver(expired()).expect(204);

      expect(await repository(PaymentSessionExpiration).count()).toBe(1);
    });

    it('does not expire a session that was already paid', async () => {
      await deliver(completed()).expect(204);
      await deliver(expired()).expect(204);

      expect((await storedSession()).status).toBe('completed');
      expect(await repository(PaymentSessionExpiration).count()).toBe(0);
    });
  });

  it('acknowledges an event it does not handle', async () => {
    await deliver(event('payment_intent.created', { id: 'pi_1' })).expect(204);

    expect((await storedSession()).status).toBe('open');
  });

  it('rejects an event signed with another secret', async () => {
    await deliver(completed(), { secret: 'whsec_forged' }).expect(400);

    expect(await repository(Payment).count()).toBe(0);
  });

  it('rejects a replayed event whose signature is too old', async () => {
    await deliver(completed(), {
      timestamp: DateTime.now().toUnixInteger() - REPLAY_AGE_SECONDS,
    }).expect(400);

    expect(await repository(Payment).count()).toBe(0);
  });

  it('rejects an event with no signature', async () => {
    await request(app.getHttpServer())
      .post('/api/payment-sessions/stripe-webhook')
      .set('Content-Type', 'application/json')
      .send(completed())
      .expect(400);
  });
});
