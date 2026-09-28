import request from 'supertest';

import { signIn } from '../support/auth.js';
import { createTestApp } from '../support/create-test-app.js';
import {
  createBookingRequest,
  createBookingRequestRejection,
} from '../support/factories/booking-request.factory.js';
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

import type { RoomType } from '../../src/room-types/entities/room-type.entity.js';
import type { User } from '../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

// Admins only read here, so fixture stays need not respect the booking rules
// the create endpoint enforces.
const stay = { checkInDate: '2030-01-10', checkOutDate: '2030-01-12' };

describe('admin booking requests (e2e)', () => {
  let app: INestApplication;
  let admin: User;
  let guest: User;
  let otherGuest: User;
  let roomType: RoomType;
  let adminToken: string;
  let guestToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDb(app);
    admin = await createUser(app, { role: 'admin' });
    guest = await createUser(app);
    otherGuest = await createUser(app);
    roomType = await createRoomType(app);
    adminToken = await signIn(app, admin.email, DEFAULT_PASSWORD);
    guestToken = await signIn(app, guest.email, DEFAULT_PASSWORD);
  });

  const get = (path: string, token = adminToken) =>
    request(app.getHttpServer())
      .get(`/api/admin/booking-requests${path}`)
      .set('Authorization', token);

  const book = (user: User, overrides: object = {}) =>
    createBookingRequest(app, { user, roomType, ...stay, ...overrides });

  const ids = (body: { data: { id: number }[] }) =>
    body.data.map((item) => item.id);

  describe('GET /admin/booking-requests', () => {
    it('lists every guest’s requests newest first, each with its guest', async () => {
      const first = await book(guest);
      const second = await book(otherGuest);

      const res = await get('').expect(200);

      expect(res.body.meta).toEqual({ total: 2, page: 1, perPage: 20 });
      expect(ids(res.body)).toEqual([Number(second.id), Number(first.id)]);
      expect(res.body.data[1]).toEqual({
        id: Number(first.id),
        roomType: { id: Number(roomType.id), name: roomType.name },
        roomsRequested: 1,
        checkInDate: stay.checkInDate,
        checkOutDate: stay.checkOutDate,
        nights: 2,
        totalAmount: 0,
        status: 'pending',
        expiresAt: first.expiresAt.toISOString(),
        createdAt: first.createdAt.toISOString(),
        payment: null,
        rejection: null,
        user: {
          id: Number(guest.id),
          email: guest.email,
          fullName: guest.fullName,
        },
      });
    });

    it('filters by status, room type and guest', async () => {
      const otherRoomType = await createRoomType(app);
      const match = await book(guest, { status: 'approved' });
      await book(guest);
      await book(otherGuest, { status: 'approved' });
      await book(guest, { roomType: otherRoomType, status: 'approved' });

      const res = await get(
        `?status=approved&roomTypeId=${roomType.id}&userId=${guest.id}`,
      ).expect(200);

      expect(ids(res.body)).toEqual([Number(match.id)]);
    });

    it('returns an empty page for an unknown guest', async () => {
      await book(guest);

      const res = await get('?userId=999999').expect(200);

      expect(res.body).toEqual({
        data: [],
        meta: { total: 0, page: 1, perPage: 20 },
      });
    });

    it('shows an overdue hold as pending until the sweep records it', async () => {
      await book(guest, { expiresAt: new Date(Date.now() - 60_000) });

      const res = await get('?status=pending').expect(200);

      expect(res.body.data[0].status).toBe('pending');
    });

    it('shows the payment and the rejection where they exist', async () => {
      const paidAt = new Date('2026-09-25T03:00:00.000Z');
      const paid = await book(guest, {
        status: 'approved',
        totalAmount: '3000000',
      });
      const paymentSession = await createPaymentSession(app, {
        bookingRequest: paid,
        status: 'completed',
      });
      await createPayment(app, { paymentSession, paidAt });
      const rejected = await book(guest, { status: 'rejected' });
      await createBookingRequestRejection(app, {
        bookingRequest: rejected,
        admin,
        reason: 'Hotel closed for maintenance',
      });

      const res = await get('').expect(200);

      expect(res.body.data[0].rejection).toMatchObject({
        reason: 'Hotel closed for maintenance',
      });
      expect(res.body.data[0].payment).toBeNull();
      expect(res.body.data[1].payment).toEqual({
        amount: 3_000_000,
        paidAt: paidAt.toISOString(),
      });
      expect(res.body.data[1].rejection).toBeNull();
    });

    it('pages the list', async () => {
      const oldest = await book(guest);
      await book(guest);
      await book(otherGuest);

      const res = await get('?page=2&perPage=2').expect(200);

      expect(res.body.meta).toEqual({ total: 3, page: 2, perPage: 2 });
      expect(ids(res.body)).toEqual([Number(oldest.id)]);
    });

    it('rejects an unknown status', async () => {
      await get('?status=done').expect(400);
    });

    it('turns guests away', async () => {
      await get('', guestToken).expect(403);
    });

    it('requires a token', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/booking-requests')
        .expect(401);
    });
  });

  describe('GET /admin/booking-requests/:id', () => {
    it('returns any guest’s request with its guest', async () => {
      const bookingRequest = await book(otherGuest);

      const res = await get(`/${bookingRequest.id}`).expect(200);

      expect(res.body.id).toBe(Number(bookingRequest.id));
      expect(res.body.user).toEqual({
        id: Number(otherGuest.id),
        email: otherGuest.email,
        fullName: otherGuest.fullName,
      });
      expect(res.body.payment).toBeNull();
      expect(res.body.rejection).toBeNull();
    });

    it('returns 404 for an unknown id', async () => {
      const res = await get('/999999').expect(404);

      expect(res.body.message).toBe('Booking request not found');
    });

    it('rejects a non-numeric id', async () => {
      await get('/abc').expect(400);
    });

    it('turns guests away', async () => {
      const bookingRequest = await book(guest);

      await get(`/${bookingRequest.id}`, guestToken).expect(403);
    });
  });
});
