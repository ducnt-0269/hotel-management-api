import request from 'supertest';
import { DataSource } from 'typeorm';

import { PaymentSession } from '../../src/payment-sessions/entities/payment-session.entity.js';
import { signIn } from '../support/auth.js';
import { createTestApp } from '../support/create-test-app.js';
import { createBookingRequest } from '../support/factories/booking-request.factory.js';
import {
  createPayment,
  createPaymentSession,
} from '../support/factories/payment-session.factory.js';
import { createRoomType } from '../support/factories/room-type.factory.js';
import {
  createUser,
  DEFAULT_PASSWORD,
} from '../support/factories/user.factory.js';
import { resetDb } from '../support/reset-db.js';

import type { BookingRequestStatus } from '../../src/booking-requests/entities/booking-request.entity.js';
import type { RoomType } from '../../src/room-types/entities/room-type.entity.js';
import type { User } from '../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

// Nothing here depends on the stay being bookable, only on the status.
const stay = { checkInDate: '2030-01-10', checkOutDate: '2030-01-12' };

// Stripe calls go to stripe-mock (.env.test): it answers with a fixture
// session, so only the shape of what comes back is asserted.
describe('payment sessions (e2e)', () => {
  let app: INestApplication;
  let guest: User;
  let otherGuest: User;
  let roomType: RoomType;
  let guestToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDb(app);
    guest = await createUser(app);
    otherGuest = await createUser(app);
    roomType = await createRoomType(app);
    guestToken = await signIn(app, guest.email, DEFAULT_PASSWORD);
  });

  const open = (bookingRequestId: string | number, token = guestToken) =>
    request(app.getHttpServer())
      .post('/api/payment-sessions')
      .set('Authorization', token)
      .send({ bookingRequestId: Number(bookingRequestId) });

  const book = (user: User, overrides: object = {}) =>
    createBookingRequest(app, {
      user,
      roomType,
      ...stay,
      status: 'approved',
      totalAmount: '3000000',
      ...overrides,
    });

  const paymentSessions = () =>
    app.get(DataSource).getRepository(PaymentSession);

  it('opens a Stripe checkout session for an approved request', async () => {
    const bookingRequest = await book(guest);

    const res = await open(bookingRequest.id).expect(201);

    expect(res.body).toEqual({
      url: expect.stringMatching(/^https:\/\/checkout\.stripe\.com\//),
      expiresAt: expect.any(String),
    });
    const stored = await paymentSessions().findOneByOrFail({
      bookingRequestId: bookingRequest.id,
    });
    expect(stored).toMatchObject({
      stripeSessionId: expect.stringMatching(/^cs_test_/),
      url: res.body.url,
      amount: '3000000',
      status: 'open',
    });
  });

  it('hands back the link that is still open instead of opening another', async () => {
    const bookingRequest = await book(guest);
    const live = await createPaymentSession(app, { bookingRequest });

    const res = await open(bookingRequest.id).expect(201);

    expect(res.body).toEqual({
      url: live.url,
      expiresAt: live.expiresAt.toISOString(),
    });
    expect(
      await paymentSessions().countBy({ bookingRequestId: bookingRequest.id }),
    ).toBe(1);
  });

  it('lets only one of two simultaneous calls open a link', async () => {
    const bookingRequest = await book(guest);

    const statuses = (
      await Promise.all([open(bookingRequest.id), open(bookingRequest.id)])
    )
      .map((res) => res.status)
      .sort((a, b) => a - b);

    expect(statuses).toEqual([201, 409]);
    expect(
      await paymentSessions().countBy({
        bookingRequestId: bookingRequest.id,
        status: 'open',
      }),
    ).toBe(1);
  });

  it('opens a new link once the previous one is recorded as expired', async () => {
    const bookingRequest = await book(guest);
    await createPaymentSession(app, { bookingRequest, status: 'expired' });

    await open(bookingRequest.id).expect(201);

    expect(
      await paymentSessions().countBy({
        bookingRequestId: bookingRequest.id,
        status: 'open',
      }),
    ).toBe(1);
  });

  it('asks to retry while a lapsed link awaits its expiry from Stripe', async () => {
    const bookingRequest = await book(guest);
    await createPaymentSession(app, {
      bookingRequest,
      expiresAt: new Date(Date.now() - 60_000),
    });

    const res = await open(bookingRequest.id).expect(409);

    expect(res.body.message).toBe(
      'Previous payment session has not closed yet, try again later',
    );
  });

  it('refuses a request that is already paid', async () => {
    const bookingRequest = await book(guest);
    await createPayment(app, {
      paymentSession: await createPaymentSession(app, {
        bookingRequest,
        status: 'completed',
      }),
    });

    const res = await open(bookingRequest.id).expect(409);

    expect(res.body.message).toBe('Booking request is already paid');
  });

  it.each<BookingRequestStatus>([
    'pending',
    'rejected',
    'cancelled',
    'expired',
  ])('refuses a %s request', async (status) => {
    const bookingRequest = await book(guest, { status });

    const res = await open(bookingRequest.id).expect(409);

    expect(res.body.message).toBe('Booking request is not approved');
    expect(await paymentSessions().count()).toBe(0);
  });

  it('hides another guest’s request behind a 404', async () => {
    const bookingRequest = await book(otherGuest);

    await open(bookingRequest.id).expect(404);

    expect(await paymentSessions().count()).toBe(0);
  });

  it('turns admins away', async () => {
    const admin = await createUser(app, { role: 'admin' });
    const bookingRequest = await book(guest);

    await open(
      bookingRequest.id,
      await signIn(app, admin.email, DEFAULT_PASSWORD),
    ).expect(403);
  });

  it('rejects a body without a booking request id', async () => {
    await request(app.getHttpServer())
      .post('/api/payment-sessions')
      .set('Authorization', guestToken)
      .send({})
      .expect(400);
  });

  it('requires a token', async () => {
    await request(app.getHttpServer())
      .post('/api/payment-sessions')
      .send({ bookingRequestId: 1 })
      .expect(401);
  });
});
