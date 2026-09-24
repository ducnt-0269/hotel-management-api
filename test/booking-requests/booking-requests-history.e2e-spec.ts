import request from 'supertest';

import { signIn } from '../support/auth.js';
import { createTestApp } from '../support/create-test-app.js';
import { createBookingRequest } from '../support/factories/booking-request.factory.js';
import { createRoomType } from '../support/factories/room-type.factory.js';
import {
  createUser,
  DEFAULT_PASSWORD,
} from '../support/factories/user.factory.js';
import { resetDb } from '../support/reset-db.js';

import type { RoomType } from '../../src/room-types/entities/room-type.entity.js';
import type { User } from '../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

// The list and detail only read, so fixture stays need not respect the
// booking rules the create endpoint enforces.
const stay = { checkInDate: '2030-01-10', checkOutDate: '2030-01-12' };

describe('own booking requests (e2e)', () => {
  let app: INestApplication;
  let guest: User;
  let otherGuest: User;
  let admin: User;
  let roomType: RoomType;
  let guestToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDb(app);
    guest = await createUser(app);
    otherGuest = await createUser(app);
    admin = await createUser(app, { role: 'admin' });
    roomType = await createRoomType(app);
    guestToken = await signIn(app, guest.email, DEFAULT_PASSWORD);
    adminToken = await signIn(app, admin.email, DEFAULT_PASSWORD);
  });

  const get = (path: string, token: string) =>
    request(app.getHttpServer())
      .get(`/api/booking-requests${path}`)
      .set('Authorization', token);

  const book = (user: User, overrides: object = {}) =>
    createBookingRequest(app, { user, roomType, ...stay, ...overrides });

  describe('GET /booking-requests', () => {
    it('lists only their own requests, newest first', async () => {
      const first = await book(guest);
      await book(otherGuest);
      const second = await book(guest);

      const res = await get('', guestToken).expect(200);

      expect(res.body.meta).toEqual({ total: 2, page: 1, perPage: 20 });
      expect(res.body.data.map((item: { id: number }) => item.id)).toEqual([
        Number(second.id),
        Number(first.id),
      ]);
      expect(res.body.data[0]).toEqual({
        id: Number(second.id),
        roomType: { id: Number(roomType.id), name: roomType.name },
        roomsRequested: 1,
        checkInDate: stay.checkInDate,
        checkOutDate: stay.checkOutDate,
        nights: 2,
        totalAmount: 0,
        status: 'pending',
        expiresAt: second.expiresAt.toISOString(),
        createdAt: second.createdAt.toISOString(),
      });
      expect(res.body.data[0]).not.toHaveProperty('user');
    });

    it('pages the list', async () => {
      const oldest = await book(guest);
      await book(guest);
      await book(guest);

      const res = await get('?page=2&perPage=2', guestToken).expect(200);

      expect(res.body.meta).toEqual({ total: 3, page: 2, perPage: 2 });
      expect(res.body.data.map((item: { id: number }) => item.id)).toEqual([
        Number(oldest.id),
      ]);
    });

    it('filters by status and room type', async () => {
      const otherRoomType = await createRoomType(app);
      const approved = await book(guest, { status: 'approved' });
      await book(guest);
      await book(guest, { roomType: otherRoomType, status: 'approved' });

      const res = await get(
        `?status=approved&roomTypeId=${roomType.id}`,
        guestToken,
      ).expect(200);

      expect(res.body.data.map((item: { id: number }) => item.id)).toEqual([
        Number(approved.id),
      ]);
    });

    it('shows an overdue hold as pending until the sweep records it', async () => {
      await book(guest, { expiresAt: new Date(Date.now() - 60_000) });

      const res = await get('', guestToken).expect(200);

      expect(res.body.data[0].status).toBe('pending');
    });

    it('rejects an unknown status', async () => {
      await get('?status=done', guestToken).expect(400);
    });

    it('turns admins away: they follow requests under /admin', async () => {
      await get('', adminToken).expect(403);
    });

    it('requires a token', async () => {
      await request(app.getHttpServer())
        .get('/api/booking-requests')
        .expect(401);
    });
  });

  describe('GET /booking-requests/:id', () => {
    it('returns the guest’s own request without the user', async () => {
      const bookingRequest = await book(guest);

      const res = await get(`/${bookingRequest.id}`, guestToken).expect(200);

      expect(res.body.id).toBe(Number(bookingRequest.id));
      expect(res.body).not.toHaveProperty('user');
    });

    it('hides another guest’s request behind a 404', async () => {
      const bookingRequest = await book(otherGuest);

      const res = await get(`/${bookingRequest.id}`, guestToken).expect(404);

      expect(res.body.message).toBe('Booking request not found');
    });

    it('returns 404 for an unknown id', async () => {
      await get('/999999', guestToken).expect(404);
    });

    it('rejects a non-numeric id', async () => {
      await get('/abc', guestToken).expect(400);
    });
  });
});
