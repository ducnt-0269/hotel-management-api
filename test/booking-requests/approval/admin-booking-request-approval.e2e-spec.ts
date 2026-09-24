import { DateTime } from 'luxon';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { BookingRequestApproval } from '../../../src/booking-requests/approval/entities/booking-request-approval.entity.js';
import { HOTEL_TIME_ZONE } from '../../../src/booking-requests/booking-request.constants.js';
import { BookingRequest } from '../../../src/booking-requests/entities/booking-request.entity.js';
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

describe('admin booking request approval (e2e)', () => {
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

  const approve = (id: string | number, token = adminToken) =>
    request(app.getHttpServer())
      .post(`/api/admin/booking-requests/${id}/approval`)
      .set('Authorization', token);

  const book = (overrides: object = {}) =>
    createBookingRequest(app, { user: guest, roomType, ...stay, ...overrides });

  const approvals = () =>
    app.get(DataSource).getRepository(BookingRequestApproval);

  const storedStatus = async (id: string) =>
    (
      await app
        .get(DataSource)
        .getRepository(BookingRequest)
        .findOneByOrFail({ id })
    ).status;

  it('approves a pending request and records who approved it', async () => {
    const bookingRequest = await book();

    const res = await approve(bookingRequest.id).expect(201);

    expect(res.body).toEqual({
      bookingRequestId: Number(bookingRequest.id),
      adminUserId: Number(admin.id),
      createdAt: expect.any(String),
    });
    expect(await storedStatus(bookingRequest.id)).toBe('approved');
    expect(
      await approvals().countBy({ bookingRequestId: bookingRequest.id }),
    ).toBe(1);
  });

  it('keeps the approved room held against other guests', async () => {
    const bookingRequest = await book();
    await approve(bookingRequest.id).expect(201);

    const otherGuest = await createUser(app);
    await request(app.getHttpServer())
      .post('/api/booking-requests')
      .set(
        'Authorization',
        await signIn(app, otherGuest.email, DEFAULT_PASSWORD),
      )
      .send({ roomTypeId: Number(roomType.id), roomsRequested: 1, ...stay })
      .expect(409);
  });

  it('refuses an overdue hold the sweep has not reached', async () => {
    const bookingRequest = await book({
      expiresAt: new Date(Date.now() - 60_000),
    });

    const res = await approve(bookingRequest.id).expect(409);

    expect(res.body.message).toBe('Booking request has expired');
    expect(await storedStatus(bookingRequest.id)).toBe('pending');
    expect(await approvals().count()).toBe(0);
  });

  it('mails the guest the approved stay', async () => {
    const bookingRequest = await book();

    await approve(bookingRequest.id).expect(201);

    const mail = await waitForMail(guest.email);
    expect(mail.Subject).toBe(
      `Yêu cầu đặt phòng #${bookingRequest.id} đã được duyệt`,
    );
    expect(mail.Text).toContain(roomType.name);
    expect(mail.HTML).toContain(roomType.name);
  });

  it('mails nothing when it refuses', async () => {
    const refused = await book({ status: 'rejected' });
    await approve(refused.id).expect(409);
    const approved = await book();
    await approve(approved.id).expect(201);

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

    const res = await approve(bookingRequest.id).expect(409);

    expect(res.body.message).toBe('Booking request is not pending');
  });

  it('does not overwrite a cancellation that lands mid-approval', async () => {
    const bookingRequest = await book();
    // Plays the guest's cancel: locks the row and cancels it, not yet committed.
    const cancel = app.get(DataSource).createQueryRunner();
    await cancel.startTransaction();
    await cancel.query(
      `UPDATE booking_requests SET status = 'cancelled' WHERE id = $1`,
      [bookingRequest.id],
    );

    // supertest sends lazily; `.then` fires the request now.
    const pending = approve(bookingRequest.id).then((res) => res);
    // Long enough for the approval's UPDATE to reach the row and wait on it.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await cancel.commitTransaction();
    await cancel.release();

    const res = await pending;
    expect(res.status).toBe(409);
    expect(await storedStatus(bookingRequest.id)).toBe('cancelled');
    expect(await approvals().count()).toBe(0);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await approve(999999).expect(404);

    expect(res.body.message).toBe('Booking request not found');
  });

  it('rejects a non-numeric id', async () => {
    await approve('abc').expect(400);
  });

  it('turns guests away', async () => {
    const bookingRequest = await book();

    await approve(
      bookingRequest.id,
      await signIn(app, guest.email, DEFAULT_PASSWORD),
    ).expect(403);
  });

  it('requires a token', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/booking-requests/1/approval')
      .expect(401);
  });
});
