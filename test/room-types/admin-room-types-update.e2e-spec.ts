import { DateTime } from 'luxon';
import request from 'supertest';

import { HOTEL_TIME_ZONE } from '../../src/booking-requests/booking-request.constants.js';
import { signIn } from '../support/auth.js';
import { createTestApp } from '../support/create-test-app.js';
import { createAmenity } from '../support/factories/amenity.factory.js';
import { createBookingRequest } from '../support/factories/booking-request.factory.js';
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

// A hotel-local date `offset` days from today.
const day = (offset: number) =>
  DateTime.now()
    .setZone(HOTEL_TIME_ZONE)
    .plus({ days: offset })
    .toFormat('yyyy-MM-dd');

describe('PATCH /admin/room-types/:id (e2e)', () => {
  let app: INestApplication;
  let guest: User;
  let roomType: RoomType;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDb(app);
    const admin = await createUser(app, { role: 'admin' });
    guest = await createUser(app);
    roomType = await createRoomType(app, {
      totalRooms: 3,
      amenities: ['wifi', 'tv'],
    });
    adminToken = await signIn(app, admin.email, DEFAULT_PASSWORD);
  });

  const patch = (body: object, id: string | number = roomType.id) =>
    request(app.getHttpServer())
      .patch(`/api/admin/room-types/${id}`)
      .set('Authorization', adminToken)
      .send(body);

  const hold = (
    checkIn: number,
    checkOut: number,
    roomsRequested: number,
    overrides: { status?: BookingRequestStatus; expiresAt?: Date } = {},
  ) =>
    createBookingRequest(app, {
      user: guest,
      roomType,
      checkInDate: day(checkIn),
      checkOutDate: day(checkOut),
      roomsRequested,
      ...overrides,
    });

  it('changes only the fields sent', async () => {
    const res = await patch({ name: 'Renamed', pricePerNight: 900_000 }).expect(
      200,
    );

    expect(res.body).toMatchObject({
      id: Number(roomType.id),
      name: 'Renamed',
      description: roomType.description,
      pricePerNight: 900_000,
      totalRooms: 3,
      amenities: [
        { id: expect.any(Number), code: 'tv' },
        { id: expect.any(Number), code: 'wifi' },
      ],
    });
    expect(res.body.updatedAt > roomType.updatedAt.toISOString()).toBe(true);
  });

  it('replaces the whole amenity set when one is sent', async () => {
    await createAmenity(app, { code: 'balcony' });

    const res = await patch({ amenities: ['balcony'] }).expect(200);

    expect(res.body.amenities).toEqual([
      { id: expect.any(Number), code: 'balcony' },
    ]);
    expect(res.body.updatedAt > roomType.updatedAt.toISOString()).toBe(true);
  });

  it('clears the amenities with an empty list', async () => {
    const res = await patch({ amenities: [] }).expect(200);

    expect(res.body.amenities).toEqual([]);
  });

  it('returns the room type unchanged for an empty body', async () => {
    const res = await patch({}).expect(200);

    expect(res.body.updatedAt).toBe(roomType.updatedAt.toISOString());
    expect(res.body.amenities).toHaveLength(2);
  });

  it('refuses a name another room type has', async () => {
    const other = await createRoomType(app);

    const res = await patch({ name: other.name }).expect(409);

    expect(res.body.message).toBe('Room type name already exists');
  });

  it('refuses an unknown amenity and keeps the old set', async () => {
    const res = await patch({ amenities: ['jacuzzi'] }).expect(400);

    expect(res.body.message).toBe('Unknown amenities: jacuzzi');
    const after = await patch({}).expect(200);
    expect(after.body.amenities).toHaveLength(2);
  });

  it('returns 404 for an unknown room type', async () => {
    await patch({ name: 'Nobody' }, 999_999).expect(404);
  });

  describe('lowering totalRooms', () => {
    it('refuses a total below the rooms held, naming each overheld night', async () => {
      await hold(5, 8, 2);
      await hold(6, 7, 1, { status: 'approved' });

      const res = await patch({ totalRooms: 2 }).expect(409);

      expect(res.body.message).toBe(`Rooms already held exceed 2 on ${day(6)}`);
    });

    it('refuses 0 while any future hold remains', async () => {
      await hold(200, 201, 1, { status: 'approved' });

      const res = await patch({ totalRooms: 0 }).expect(409);

      expect(res.body.message).toBe(
        `Rooms already held exceed 0 on ${day(200)}`,
      );
    });

    it('counts tonight, which a stay that began yesterday still holds', async () => {
      await hold(-1, 1, 3, { status: 'approved' });

      const res = await patch({ totalRooms: 2 }).expect(409);

      expect(res.body.message).toBe(`Rooms already held exceed 2 on ${day(0)}`);
    });

    it('ignores past nights and requests that hold nothing', async () => {
      await hold(-5, -3, 3, { status: 'approved' });
      await hold(5, 6, 3, { status: 'rejected' });
      await hold(5, 6, 3, { status: 'cancelled' });
      await hold(5, 6, 3, { status: 'expired' });
      await hold(5, 6, 3, { expiresAt: new Date(Date.now() - 1000) });

      const res = await patch({ totalRooms: 0 }).expect(200);

      expect(res.body.totalRooms).toBe(0);
    });

    it('allows a total that still covers every hold', async () => {
      await hold(5, 8, 2);

      const res = await patch({ totalRooms: 2 }).expect(200);

      expect(res.body.totalRooms).toBe(2);
    });
  });

  it('raises totalRooms whatever is held', async () => {
    await hold(5, 6, 3, { status: 'approved' });

    const res = await patch({ totalRooms: 10 }).expect(200);

    expect(res.body.totalRooms).toBe(10);
  });
});
