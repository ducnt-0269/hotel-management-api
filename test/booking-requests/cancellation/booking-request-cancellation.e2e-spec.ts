import { DateTime } from 'luxon';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { HOTEL_TIME_ZONE } from '../../../src/booking-requests/booking-request.constants.js';
import { BookingRequestCancellation } from '../../../src/booking-requests/cancellation/entities/booking-request-cancellation.entity.js';
import { BookingRequest } from '../../../src/booking-requests/entities/booking-request.entity.js';
import { signIn } from '../../support/auth.js';
import { createTestApp } from '../../support/create-test-app.js';
import { createBookingRequest } from '../../support/factories/booking-request.factory.js';
import { createRoomType } from '../../support/factories/room-type.factory.js';
import {
  createUser,
  DEFAULT_PASSWORD,
} from '../../support/factories/user.factory.js';
import { resetDb } from '../../support/reset-db.js';

import type { BookingRequestStatus } from '../../../src/booking-requests/entities/booking-request.entity.js';
import type { RoomType } from '../../../src/room-types/entities/room-type.entity.js';
import type { User } from '../../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

// Relative to today in hotel time, so a stay booked through the endpoint
// never falls in the past.
const day = (offset: number) =>
  DateTime.now()
    .setZone(HOTEL_TIME_ZONE)
    .plus({ days: offset })
    .toFormat('yyyy-MM-dd');
const stay = { checkInDate: day(3), checkOutDate: day(5) };

describe('booking request cancellation (e2e)', () => {
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
    roomType = await createRoomType(app, { totalRooms: 1 });
    guestToken = await signIn(app, guest.email, DEFAULT_PASSWORD);
  });

  const cancel = (id: string | number, token = guestToken) =>
    request(app.getHttpServer())
      .post(`/api/booking-requests/${id}/cancellation`)
      .set('Authorization', token);

  const book = (user: User, overrides: object = {}) =>
    createBookingRequest(app, { user, roomType, ...stay, ...overrides });

  const cancellations = () =>
    app.get(DataSource).getRepository(BookingRequestCancellation);

  it('withdraws a pending request and records the cancellation', async () => {
    const bookingRequest = await book(guest);

    const res = await cancel(bookingRequest.id).expect(201);

    expect(res.body).toEqual({
      bookingRequestId: Number(bookingRequest.id),
      createdAt: expect.any(String),
    });
    const stored = await app
      .get(DataSource)
      .getRepository(BookingRequest)
      .findOneByOrFail({ id: bookingRequest.id });
    expect(stored.status).toBe('cancelled');
    expect(
      await cancellations().countBy({ bookingRequestId: bookingRequest.id }),
    ).toBe(1);

    const detail = await request(app.getHttpServer())
      .get(`/api/booking-requests/${bookingRequest.id}`)
      .set('Authorization', guestToken)
      .expect(200);
    expect(detail.body.status).toBe('cancelled');
  });

  it('gives the held room back to other guests', async () => {
    const bookingRequest = await book(guest);
    const otherToken = await signIn(app, otherGuest.email, DEFAULT_PASSWORD);
    const raise = () =>
      request(app.getHttpServer())
        .post('/api/booking-requests')
        .set('Authorization', otherToken)
        .send({ roomTypeId: Number(roomType.id), roomsRequested: 1, ...stay });

    await raise().expect(409);
    await cancel(bookingRequest.id).expect(201);
    await raise().expect(201);
  });

  it('refuses an overdue hold the sweep has not recorded yet', async () => {
    const bookingRequest = await book(guest, {
      expiresAt: new Date(Date.now() - 60_000),
    });

    const res = await cancel(bookingRequest.id).expect(409);

    expect(res.body.message).toBe('Booking request is not pending');
    expect(await cancellations().count()).toBe(0);
  });

  it.each<BookingRequestStatus>([
    'approved',
    'rejected',
    'cancelled',
    'expired',
  ])('refuses a %s request', async (status) => {
    const bookingRequest = await book(guest, { status });

    const res = await cancel(bookingRequest.id).expect(409);

    expect(res.body.message).toBe('Booking request is not pending');
  });

  it('records a second cancel only once', async () => {
    const bookingRequest = await book(guest);

    await cancel(bookingRequest.id).expect(201);
    await cancel(bookingRequest.id).expect(409);

    expect(
      await cancellations().countBy({ bookingRequestId: bookingRequest.id }),
    ).toBe(1);
  });

  it('hides another guest’s request behind a 404', async () => {
    const bookingRequest = await book(otherGuest);

    const res = await cancel(bookingRequest.id).expect(404);

    expect(res.body.message).toBe('Booking request not found');
    expect(await cancellations().count()).toBe(0);
  });

  it('returns 404 for an unknown id', async () => {
    await cancel(999999).expect(404);
  });

  it('rejects a non-numeric id', async () => {
    await cancel('abc').expect(400);
  });

  it('turns admins away', async () => {
    const admin = await createUser(app, { role: 'admin' });
    const bookingRequest = await book(guest);

    await cancel(
      bookingRequest.id,
      await signIn(app, admin.email, DEFAULT_PASSWORD),
    ).expect(403);
  });

  it('requires a token', async () => {
    await request(app.getHttpServer())
      .post('/api/booking-requests/1/cancellation')
      .expect(401);
  });
});
