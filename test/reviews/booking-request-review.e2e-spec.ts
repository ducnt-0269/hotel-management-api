import { DateTime } from 'luxon';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { HOTEL_TIME_ZONE } from '../../src/booking-requests/booking-request.constants.js';
import { Review } from '../../src/reviews/entities/review.entity.js';
import { signIn } from '../support/auth.js';
import { createTestApp } from '../support/create-test-app.js';
import { createBookingRequest } from '../support/factories/booking-request.factory.js';
import {
  createPayment,
  createPaymentSession,
} from '../support/factories/payment-session.factory.js';
import { createReview } from '../support/factories/review.factory.js';
import { createRoomType } from '../support/factories/room-type.factory.js';
import {
  createUser,
  DEFAULT_PASSWORD,
} from '../support/factories/user.factory.js';
import { resetDb } from '../support/reset-db.js';

import type { BookingRequest } from '../../src/booking-requests/entities/booking-request.entity.js';
import type { RoomType } from '../../src/room-types/entities/room-type.entity.js';
import type { User } from '../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

// Relative to today in hotel time, so "past"/"future"/"today" stays true no
// matter when the suite runs.
const day = (offset: number) =>
  DateTime.now()
    .setZone(HOTEL_TIME_ZONE)
    .plus({ days: offset })
    .toFormat('yyyy-MM-dd');
const endedStay = { checkInDate: day(-10), checkOutDate: day(-5) };
const stayEndingToday = { checkInDate: day(-3), checkOutDate: day(0) };
const ongoingStay = { checkInDate: day(-1), checkOutDate: day(3) };

describe('booking request review (e2e)', () => {
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
    roomType = await createRoomType(app, { totalRooms: 3 });
    guestToken = await signIn(app, guest.email, DEFAULT_PASSWORD);
  });

  const book = (user: User, overrides: object = {}) =>
    createBookingRequest(app, {
      user,
      roomType,
      status: 'approved',
      totalAmount: '500000',
      ...endedStay,
      ...overrides,
    });

  const pay = async (bookingRequest: BookingRequest) => {
    const paymentSession = await createPaymentSession(app, {
      bookingRequest,
      status: 'completed',
    });
    await createPayment(app, { paymentSession });
  };

  const bookPaidAndEligible = async (overrides: object = {}) => {
    const bookingRequest = await book(guest, overrides);
    await pay(bookingRequest);
    return bookingRequest;
  };

  const postReview = (id: string | number, body: object, token = guestToken) =>
    request(app.getHttpServer())
      .post(`/api/booking-requests/${id}/review`)
      .set('Authorization', token)
      .send(body);

  const getReview = (id: string | number, token = guestToken) =>
    request(app.getHttpServer())
      .get(`/api/booking-requests/${id}/review`)
      .set('Authorization', token);

  const reviews = () => app.get(DataSource).getRepository(Review);

  const validBody = { rating: 5, comment: 'Loved the stay, spotless room.' };

  describe('POST /booking-requests/:id/review', () => {
    it('records a pending review for an eligible booking', async () => {
      const bookingRequest = await bookPaidAndEligible();

      const res = await postReview(bookingRequest.id, validBody).expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        bookingRequestId: Number(bookingRequest.id),
        roomTypeId: Number(roomType.id),
        rating: 5,
        comment: validBody.comment,
        status: 'pending',
        createdAt: expect.any(String),
      });
      expect(
        await reviews().countBy({ bookingRequestId: bookingRequest.id }),
      ).toBe(1);
    });

    it('allows reviewing on the check-out day itself', async () => {
      const bookingRequest = await bookPaidAndEligible(stayEndingToday);

      await postReview(bookingRequest.id, validBody).expect(201);
    });

    it('refuses a booking that is not approved', async () => {
      const bookingRequest = await book(guest, {
        status: 'pending',
        ...endedStay,
      });

      const res = await postReview(bookingRequest.id, validBody).expect(409);

      expect(res.body.message).toBe('Booking request is not approved');
    });

    // The stay has not ended either: payment is checked first.
    it('refuses an approved booking that has not been paid', async () => {
      const bookingRequest = await book(guest, ongoingStay);

      const res = await postReview(bookingRequest.id, validBody).expect(409);

      expect(res.body.message).toBe('Booking request is not paid');
    });

    it('refuses a booking whose stay has not ended yet', async () => {
      const bookingRequest = await bookPaidAndEligible(ongoingStay);

      const res = await postReview(bookingRequest.id, validBody).expect(409);

      expect(res.body.message).toBe('Stay has not ended');
    });

    it('refuses a second review for the same booking', async () => {
      const bookingRequest = await bookPaidAndEligible();
      await postReview(bookingRequest.id, validBody).expect(201);

      const res = await postReview(bookingRequest.id, validBody).expect(409);

      expect(res.body.message).toBe('Booking request already has a review');
      expect(
        await reviews().countBy({ bookingRequestId: bookingRequest.id }),
      ).toBe(1);
    });

    it('records only one review when two requests race', async () => {
      const bookingRequest = await bookPaidAndEligible();

      const [first, second] = await Promise.all([
        postReview(bookingRequest.id, validBody),
        postReview(bookingRequest.id, validBody),
      ]);

      const statuses = [first.status, second.status].sort((a, b) => a - b);
      expect(statuses).toEqual([201, 409]);
      expect(
        await reviews().countBy({ bookingRequestId: bookingRequest.id }),
      ).toBe(1);
    });

    it('hides another guest’s booking behind a 404', async () => {
      const bookingRequest = await createBookingRequest(app, {
        user: otherGuest,
        roomType,
        status: 'approved',
        ...endedStay,
      });

      const res = await postReview(bookingRequest.id, validBody).expect(404);

      expect(res.body.message).toBe('Booking request not found');
    });

    it('returns 404 for an unknown id', async () => {
      await postReview(999999, validBody).expect(404);
    });

    it.each([0, 6, 2.5])('rejects a rating of %s', async (rating) => {
      const bookingRequest = await bookPaidAndEligible();

      await postReview(bookingRequest.id, {
        ...validBody,
        rating,
      }).expect(400);
    });

    it.each(['', '   ', 'x'.repeat(1001)])(
      'rejects an invalid comment',
      async (comment) => {
        const bookingRequest = await bookPaidAndEligible();

        await postReview(bookingRequest.id, {
          ...validBody,
          comment,
        }).expect(400);
      },
    );

    it('turns admins away', async () => {
      const admin = await createUser(app, { role: 'admin' });
      const bookingRequest = await bookPaidAndEligible();

      await postReview(
        bookingRequest.id,
        validBody,
        await signIn(app, admin.email, DEFAULT_PASSWORD),
      ).expect(403);
    });

    it('requires a token', async () => {
      await request(app.getHttpServer())
        .post('/api/booking-requests/1/review')
        .send(validBody)
        .expect(401);
    });
  });

  describe('GET /booking-requests/:id/review', () => {
    it('returns the caller’s review', async () => {
      const bookingRequest = await bookPaidAndEligible();
      const review = await createReview(app, {
        bookingRequest,
        rating: 4,
        comment: 'Nice view',
      });

      const res = await getReview(bookingRequest.id).expect(200);

      expect(res.body).toEqual({
        id: Number(review.id),
        bookingRequestId: Number(bookingRequest.id),
        roomTypeId: Number(roomType.id),
        rating: 4,
        comment: 'Nice view',
        status: 'pending',
        createdAt: expect.any(String),
      });
    });

    it('returns 404 when the booking has no review yet', async () => {
      const bookingRequest = await bookPaidAndEligible();

      const res = await getReview(bookingRequest.id).expect(404);

      expect(res.body.message).toBe('Review not found');
    });

    it('hides another guest’s booking behind a 404', async () => {
      const bookingRequest = await createBookingRequest(app, {
        user: otherGuest,
        roomType,
        status: 'approved',
        ...endedStay,
      });
      await createReview(app, { bookingRequest });

      const res = await getReview(bookingRequest.id).expect(404);

      expect(res.body.message).toBe('Booking request not found');
    });

    it('returns 404 for an unknown id', async () => {
      await getReview(999999).expect(404);
    });

    it('turns admins away', async () => {
      const admin = await createUser(app, { role: 'admin' });
      const bookingRequest = await bookPaidAndEligible();
      await createReview(app, { bookingRequest });

      await getReview(
        bookingRequest.id,
        await signIn(app, admin.email, DEFAULT_PASSWORD),
      ).expect(403);
    });
  });
});
