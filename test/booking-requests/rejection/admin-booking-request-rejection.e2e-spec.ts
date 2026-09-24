import { DateTime } from 'luxon';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { HOTEL_TIME_ZONE } from '../../../src/booking-requests/booking-request.constants.js';
import { BookingRequest } from '../../../src/booking-requests/entities/booking-request.entity.js';
import { BookingRequestExpirationService } from '../../../src/booking-requests/expiration/booking-request-expiration.service.js';
import { BookingRequestRejection } from '../../../src/booking-requests/rejection/entities/booking-request-rejection.entity.js';
import { signIn } from '../../support/auth.js';
import { createTestApp } from '../../support/create-test-app.js';
import { createBookingRequest } from '../../support/factories/booking-request.factory.js';
import { createRoomType } from '../../support/factories/room-type.factory.js';
import {
  createUser,
  DEFAULT_PASSWORD,
} from '../../support/factories/user.factory.js';
import { clearMailbox, countMail, waitForMail } from '../../support/mailpit.js';
import { resetDb } from '../../support/reset-db.js';

import type { BookingRequestStatus } from '../../../src/booking-requests/entities/booking-request.entity.js';
import type { RoomType } from '../../../src/room-types/entities/room-type.entity.js';
import type { User } from '../../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

const day = (offset: number) =>
  DateTime.now()
    .setZone(HOTEL_TIME_ZONE)
    .plus({ days: offset })
    .toFormat('yyyy-MM-dd');
const stay = { checkInDate: day(3), checkOutDate: day(5) };
const reason = 'Closed for renovation on those dates';

describe('admin booking request rejection (e2e)', () => {
  let app: INestApplication;
  let admin: User;
  let guest: User;
  let roomType: RoomType;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await Promise.all([resetDb(app), clearMailbox()]);
    admin = await createUser(app, { role: 'admin' });
    guest = await createUser(app);
    roomType = await createRoomType(app, { totalRooms: 1 });
    adminToken = await signIn(app, admin.email, DEFAULT_PASSWORD);
  });

  const reject = (
    id: string | number,
    body: object = { reason },
    token = adminToken,
  ) =>
    request(app.getHttpServer())
      .post(`/api/admin/booking-requests/${id}/rejection`)
      .set('Authorization', token)
      .send(body);

  const book = (overrides: object = {}) =>
    createBookingRequest(app, { user: guest, roomType, ...stay, ...overrides });

  const rejections = () =>
    app.get(DataSource).getRepository(BookingRequestRejection);

  const storedStatus = async (id: string) =>
    (
      await app
        .get(DataSource)
        .getRepository(BookingRequest)
        .findOneByOrFail({ id })
    ).status;

  it('rejects a pending request and records the reason', async () => {
    const bookingRequest = await book();

    const res = await reject(bookingRequest.id, {
      reason: `  ${reason}  `,
    }).expect(201);

    expect(res.body).toEqual({
      bookingRequestId: Number(bookingRequest.id),
      adminUserId: Number(admin.id),
      reason,
      createdAt: expect.any(String),
    });
    expect(await storedStatus(bookingRequest.id)).toBe('rejected');
    const stored = await rejections().findBy({
      bookingRequestId: bookingRequest.id,
    });
    expect(stored.map((row) => row.reason)).toEqual([reason]);
  });

  it('gives the held room back to other guests', async () => {
    const bookingRequest = await book();
    const otherGuest = await createUser(app);
    const otherToken = await signIn(app, otherGuest.email, DEFAULT_PASSWORD);
    const raise = () =>
      request(app.getHttpServer())
        .post('/api/booking-requests')
        .set('Authorization', otherToken)
        .send({ roomTypeId: Number(roomType.id), roomsRequested: 1, ...stay });

    await raise().expect(409);
    await reject(bookingRequest.id).expect(201);
    await raise().expect(201);
  });

  it.each([{}, { reason: '' }, { reason: '   ' }, { reason: 'x'.repeat(501) }])(
    'refuses a missing, blank or overlong reason (%o)',
    async (body) => {
      const bookingRequest = await book();

      await reject(bookingRequest.id, body).expect(400);

      expect(await storedStatus(bookingRequest.id)).toBe('pending');
    },
  );

  it('rejects an overdue hold the sweep has not reached, which then skips it', async () => {
    const bookingRequest = await book({
      expiresAt: new Date(Date.now() - 60_000),
    });

    await reject(bookingRequest.id).expect(201);

    expect(await storedStatus(bookingRequest.id)).toBe('rejected');
    expect(await app.get(BookingRequestExpirationService).expireOverdue()).toBe(
      0,
    );
  });

  it('mails the guest the rejection with its reason', async () => {
    const bookingRequest = await book();

    await reject(bookingRequest.id).expect(201);

    const mail = await waitForMail(guest.email);
    expect(mail.Subject).toBe(
      `Yêu cầu đặt phòng #${bookingRequest.id} bị từ chối`,
    );
    expect(mail.Text).toContain(roomType.name);
    expect(mail.Text).toContain(reason);
    expect(mail.HTML).toContain(reason);
  });

  it('mails nothing when it refuses', async () => {
    const refused = await book({ status: 'approved' });
    await reject(refused.id).expect(409);
    const rejected = await book({ status: 'pending' });
    await reject(rejected.id).expect(201);

    await waitForMail(guest.email);
    expect(await countMail(guest.email)).toBe(1);
  });

  it.each<BookingRequestStatus>([
    'approved',
    'rejected',
    'cancelled',
    'expired',
  ])('refuses a %s request', async (status) => {
    const bookingRequest = await book({ status });

    const res = await reject(bookingRequest.id).expect(409);

    expect(res.body.message).toBe('Booking request is not pending');
  });

  it('returns 404 for an unknown id', async () => {
    const res = await reject(999999).expect(404);

    expect(res.body.message).toBe('Booking request not found');
  });

  it('rejects a non-numeric id', async () => {
    await reject('abc').expect(400);
  });

  it('turns guests away', async () => {
    const bookingRequest = await book();

    await reject(
      bookingRequest.id,
      { reason },
      await signIn(app, guest.email, DEFAULT_PASSWORD),
    ).expect(403);
  });

  it('requires a token', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/booking-requests/1/rejection')
      .send({ reason })
      .expect(401);
  });
});
