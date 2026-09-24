import { DateTime } from 'luxon';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { HOTEL_TIME_ZONE } from '../../src/booking-requests/booking-request.constants.js';
import { BookingRequest } from '../../src/booking-requests/entities/booking-request.entity.js';
import { RoomType } from '../../src/room-types/entities/room-type.entity.js';
import { signIn } from '../support/auth.js';
import { createTestApp } from '../support/create-test-app.js';
import { createBookingRequest } from '../support/factories/booking-request.factory.js';
import { createRoomType } from '../support/factories/room-type.factory.js';
import {
  createUser,
  DEFAULT_PASSWORD,
} from '../support/factories/user.factory.js';
import { resetDb } from '../support/reset-db.js';

import type { User } from '../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

// Stays are placed relative to today in hotel time, so the "tomorrow at the
// earliest" rule never turns a fixture date into the past.
const day = (offset: number) =>
  DateTime.now()
    .setZone(HOTEL_TIME_ZONE)
    .plus({ days: offset })
    .toFormat('yyyy-MM-dd');
const daysAfter = (date: string, offset: number) =>
  DateTime.fromISO(date, { zone: HOTEL_TIME_ZONE })
    .plus({ days: offset })
    .toFormat('yyyy-MM-dd');
const yearAhead = DateTime.now()
  .setZone(HOTEL_TIME_ZONE)
  .plus({ months: 12 })
  .toFormat('yyyy-MM-dd');

describe('booking requests (e2e)', () => {
  let app: INestApplication;
  let user: User;
  let authorization: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDb(app);
    user = await createUser(app);
    authorization = await signIn(app, user.email, DEFAULT_PASSWORD);
  });

  const post = (body: object, token = authorization) =>
    request(app.getHttpServer())
      .post('/api/booking-requests')
      .set('Authorization', token)
      .send(body);

  const bookingRequests = () =>
    app.get(DataSource).getRepository(BookingRequest);

  describe('POST /api/booking-requests', () => {
    it('records a pending request, fixes its total and holds the rooms', async () => {
      const roomType = await createRoomType(app, {
        name: 'Deluxe Sea View',
        pricePerNight: 1_500_000,
        totalRooms: 3,
      });
      const before = Date.now();

      const { body } = await post({
        roomTypeId: Number(roomType.id),
        roomsRequested: 2,
        checkInDate: day(10),
        checkOutDate: day(12),
      }).expect(201);

      expect(body).toEqual({
        id: expect.any(Number),
        roomType: { id: Number(roomType.id), name: 'Deluxe Sea View' },
        roomsRequested: 2,
        checkInDate: day(10),
        checkOutDate: day(12),
        nights: 2,
        totalAmount: 6_000_000,
        status: 'pending',
        expiresAt: expect.any(String),
        createdAt: expect.any(String),
      });
      // Check-in is days away, so the hold lasts 24 hours from sending.
      const expiresIn = Date.parse(body.expiresAt) - before;
      expect(expiresIn).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
      expect(expiresIn).toBeLessThan(24 * 60 * 60 * 1000 + 60_000);
    });

    it('holds until 00:00 hotel time when check-in is tomorrow', async () => {
      const roomType = await createRoomType(app, { totalRooms: 1 });

      const { body } = await post({
        roomTypeId: Number(roomType.id),
        roomsRequested: 1,
        checkInDate: day(1),
        checkOutDate: day(2),
      }).expect(201);

      expect(body.expiresAt).toBe(
        new Date(`${day(1)}T00:00:00+07:00`).toISOString(),
      );
    });

    it('holds all five rooms under one request when five are free', async () => {
      const roomType = await createRoomType(app, { totalRooms: 5 });

      const { body } = await post({
        roomTypeId: Number(roomType.id),
        roomsRequested: 5,
        checkInDate: day(10),
        checkOutDate: day(12),
      }).expect(201);

      expect(body.roomsRequested).toBe(5);
      expect(await bookingRequests().count()).toBe(1);
    });

    it('refuses the whole request when a single night is short, naming only that night', async () => {
      // 3 rooms; 2 held for nights 9 and 10. Asking 2 for nights 10 and 11
      // needs 4 on night 10, although night 11 is free.
      const roomType = await createRoomType(app, { totalRooms: 3 });
      await createBookingRequest(app, {
        user,
        roomType,
        roomsRequested: 2,
        checkInDate: day(9),
        checkOutDate: day(11),
      });

      const { body } = await post({
        roomTypeId: Number(roomType.id),
        roomsRequested: 2,
        checkInDate: day(10),
        checkOutDate: day(12),
      }).expect(409);

      expect(body.message).toBe(`Not enough rooms on ${day(10)}`);
      expect(await bookingRequests().count()).toBe(1);
    });

    it('ignores requests that no longer hold rooms', async () => {
      const roomType = await createRoomType(app, { totalRooms: 1 });
      for (const status of ['rejected', 'cancelled', 'expired'] as const) {
        await createBookingRequest(app, {
          user,
          roomType,
          status,
          checkInDate: day(10),
          checkOutDate: day(12),
        });
      }

      await post({
        roomTypeId: Number(roomType.id),
        roomsRequested: 1,
        checkInDate: day(10),
        checkOutDate: day(12),
      }).expect(201);
    });

    it('frees the rooms of a pending hold the moment it expires, before any sweep', async () => {
      const roomType = await createRoomType(app, { totalRooms: 1 });
      await createBookingRequest(app, {
        user,
        roomType,
        checkInDate: day(10),
        checkOutDate: day(12),
        expiresAt: new Date(Date.now() - 60_000),
      });

      await post({
        roomTypeId: Number(roomType.id),
        roomsRequested: 1,
        checkInDate: day(10),
        checkOutDate: day(12),
      }).expect(201);
    });

    it('lets a check-out and a check-in share a day on a single room', async () => {
      const roomType = await createRoomType(app, { totalRooms: 1 });
      const stay = (checkInDate: string, checkOutDate: string) =>
        post({
          roomTypeId: Number(roomType.id),
          roomsRequested: 1,
          checkInDate,
          checkOutDate,
        });

      await stay(day(10), day(12)).expect(201);
      await stay(day(12), day(14)).expect(201);
    });

    it('never overbooks under concurrent requests', async () => {
      const roomType = await createRoomType(app, { totalRooms: 1 });
      const guests = await Promise.all(
        Array.from({ length: 5 }, () => createUser(app)),
      );
      const tokens = await Promise.all(
        guests.map((guest) => signIn(app, guest.email, DEFAULT_PASSWORD)),
      );

      const responses = await Promise.all(
        tokens.map((token) =>
          post(
            {
              roomTypeId: Number(roomType.id),
              roomsRequested: 1,
              checkInDate: day(10),
              checkOutDate: day(11),
            },
            token,
          ),
        ),
      );

      const statuses = responses.map((res) => res.status).sort((a, b) => a - b);
      expect(statuses).toEqual([201, 409, 409, 409, 409]);
      expect(await bookingRequests().count()).toBe(1);
    });

    it('keeps the total fixed when the price changes afterwards', async () => {
      const roomType = await createRoomType(app, { pricePerNight: 1_000_000 });
      const { body } = await post({
        roomTypeId: Number(roomType.id),
        roomsRequested: 1,
        checkInDate: day(10),
        checkOutDate: day(11),
      }).expect(201);

      await app
        .get(DataSource)
        .getRepository(RoomType)
        .update(roomType.id, { pricePerNight: '9000000' });

      const stored = await bookingRequests().findOneByOrFail({
        id: String(body.id),
      });
      expect(stored.totalAmount).toBe('1000000');
    });

    it('records the request for the signed-in user, whatever the body claims', async () => {
      const other = await createUser(app);
      const roomType = await createRoomType(app);

      const { body } = await post({
        userId: Number(other.id),
        roomTypeId: Number(roomType.id),
        roomsRequested: 1,
        checkInDate: day(10),
        checkOutDate: day(11),
      }).expect(201);

      const stored = await bookingRequests().findOneByOrFail({
        id: String(body.id),
      });
      expect(stored.userId).toBe(user.id);
    });

    it('404s on a room type that does not exist', async () => {
      await post({
        roomTypeId: 999_999,
        roomsRequested: 1,
        checkInDate: day(10),
        checkOutDate: day(11),
      }).expect(404);
    });

    it('409s on a room type that is no longer sold', async () => {
      const roomType = await createRoomType(app, { totalRooms: 0 });

      const { body } = await post({
        roomTypeId: Number(roomType.id),
        roomsRequested: 1,
        checkInDate: day(10),
        checkOutDate: day(11),
      }).expect(409);

      expect(body.message).toBe('Room type is not bookable');
      expect(await bookingRequests().count()).toBe(0);
    });

    it.each([
      ['six rooms', { roomsRequested: 6 }, 'roomsRequested'],
      ['zero rooms', { roomsRequested: 0 }, 'roomsRequested'],
      [
        'check-in today',
        { checkInDate: day(0) },
        'checkInDate: Must be tomorrow or later',
      ],
      [
        'check-in past 12 months',
        {
          checkInDate: daysAfter(yearAhead, 1),
          checkOutDate: daysAfter(yearAhead, 2),
        },
        'checkInDate: Must be within 12 months',
      ],
      [
        'check-out before check-in',
        { checkOutDate: day(9) },
        'checkOutDate: Must be after checkInDate',
      ],
      [
        'check-out on check-in',
        { checkOutDate: day(10) },
        'checkOutDate: Must be after checkInDate',
      ],
      [
        '31 nights',
        { checkOutDate: day(41) },
        'checkOutDate: Stay cannot exceed 30 nights',
      ],
      ['a malformed date', { checkInDate: '2026-13-01' }, 'checkInDate'],
    ])('400s on %s, recording nothing', async (_case, override, message) => {
      const roomType = await createRoomType(app, { totalRooms: 10 });

      const { body } = await post({
        roomTypeId: Number(roomType.id),
        roomsRequested: 1,
        checkInDate: day(10),
        checkOutDate: day(11),
        ...override,
      }).expect(400);

      expect(body.message.join('\n')).toContain(message);
      expect(await bookingRequests().count()).toBe(0);
    });

    it('accepts a 30-night stay starting 12 months out', async () => {
      const roomType = await createRoomType(app);
      await post({
        roomTypeId: Number(roomType.id),
        roomsRequested: 1,
        checkInDate: yearAhead,
        checkOutDate: daysAfter(yearAhead, 30),
      }).expect(201);
    });

    it('401s without a token', async () => {
      await request(app.getHttpServer())
        .post('/api/booking-requests')
        .send({})
        .expect(401);
    });

    it('403s an admin, recording nothing', async () => {
      const admin = await createUser(app, { role: 'admin' });
      const roomType = await createRoomType(app);

      await post(
        {
          roomTypeId: Number(roomType.id),
          roomsRequested: 1,
          checkInDate: day(10),
          checkOutDate: day(11),
        },
        await signIn(app, admin.email, DEFAULT_PASSWORD),
      ).expect(403);

      expect(await bookingRequests().count()).toBe(0);
    });
  });
});
