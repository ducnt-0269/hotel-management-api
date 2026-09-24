import { DateTime } from 'luxon';
import request from 'supertest';

import { HOTEL_TIME_ZONE } from '../../src/booking-requests/booking-request.constants.js';
import { createTestApp } from '../support/create-test-app.js';
import { createBookingRequest } from '../support/factories/booking-request.factory.js';
import { createRoomType } from '../support/factories/room-type.factory.js';
import { createUser } from '../support/factories/user.factory.js';
import { resetDb } from '../support/reset-db.js';

import type { BookingRequestStatus } from '../../src/booking-requests/entities/booking-request.entity.js';
import type { RoomType } from '../../src/room-types/entities/room-type.entity.js';
import type { User } from '../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

// Which room types a stay leaves enough rooms in. Its own file
// rather than more cases in room-types-search.e2e-spec.ts: it needs guests
// and holds, and the two together would pass the size ceiling.
// Read once, so the search and the holds agree on dates even if the run
// crosses midnight.
const today = DateTime.now().setZone(HOTEL_TIME_ZONE);
const day = (offset: number) =>
  today.plus({ days: offset }).toFormat('yyyy-MM-dd');
// Three nights: day 10, 11 and 12.
const stay = { checkInDate: day(10), checkOutDate: day(13) };
const searchPath = `/api/room-types?checkInDate=${stay.checkInDate}&checkOutDate=${stay.checkOutDate}`;

describe('room type availability search (e2e)', () => {
  let app: INestApplication;
  let guest: User;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDb(app);
    guest = await createUser(app);
  });

  const get = (path: string) => request(app.getHttpServer()).get(path);

  const hold = (
    roomType: RoomType,
    checkInOffset: number,
    checkOutOffset: number,
    overrides: {
      roomsRequested?: number;
      status?: BookingRequestStatus;
      expiresAt?: Date;
    } = {},
  ) =>
    createBookingRequest(app, {
      user: guest,
      roomType,
      checkInDate: day(checkInOffset),
      checkOutDate: day(checkOutOffset),
      ...overrides,
    });

  const names = (body: { data: { name: string }[] }) =>
    body.data.map((roomType) => roomType.name);

  it('keeps a room type only if its tightest night fits the rooms asked for', async () => {
    const suite = await createRoomType(app, { name: 'Suite', totalRooms: 3 });
    await hold(suite, 10, 11);
    await hold(suite, 11, 12, { roomsRequested: 2 });

    const one = await get(`${searchPath}&rooms=1`).expect(200);
    const two = await get(`${searchPath}&rooms=2`).expect(200);

    // Night 11 has 1 room free: enough for one room, not for two.
    expect(names(one.body)).toEqual(['Suite']);
    expect(two.body.data).toEqual([]);
  });

  it('asks for one room when rooms is left out', async () => {
    const suite = await createRoomType(app, { name: 'Suite', totalRooms: 2 });
    await hold(suite, 10, 13);

    const { body } = await get(searchPath).expect(200);

    expect(names(body)).toEqual(['Suite']);
  });

  it('drops a room type full on any one night, and counts only the rest', async () => {
    const suite = await createRoomType(app, { name: 'Suite', totalRooms: 1 });
    await createRoomType(app, { name: 'Economy', totalRooms: 1 });
    await hold(suite, 12, 14);

    const { body } = await get(searchPath).expect(200);

    expect(names(body)).toEqual(['Economy']);
    expect(body.meta).toEqual({ total: 1, page: 1, perPage: 20 });
  });

  it('counts approved holds', async () => {
    const suite = await createRoomType(app, { name: 'Suite', totalRooms: 1 });
    await hold(suite, 10, 13, { status: 'approved' });

    const { body } = await get(searchPath).expect(200);

    expect(body.data).toEqual([]);
  });

  it.each<BookingRequestStatus>(['rejected', 'cancelled', 'expired'])(
    'ignores a %s request',
    async (status) => {
      const suite = await createRoomType(app, {
        name: 'Suite',
        totalRooms: 1,
      });
      await hold(suite, 10, 13, { status });

      const { body } = await get(searchPath).expect(200);

      expect(names(body)).toEqual(['Suite']);
    },
  );

  it('ignores a pending hold past its expiry the sweep has not reached', async () => {
    const suite = await createRoomType(app, { name: 'Suite', totalRooms: 1 });
    await hold(suite, 10, 13, { expiresAt: new Date(Date.now() - 60_000) });

    const { body } = await get(searchPath).expect(200);

    expect(names(body)).toEqual(['Suite']);
  });

  it('does not count a stay that checks out on the check-in day', async () => {
    const suite = await createRoomType(app, { name: 'Suite', totalRooms: 1 });
    await hold(suite, 8, 10);
    await hold(suite, 13, 15);

    const { body } = await get(searchPath).expect(200);

    expect(names(body)).toEqual(['Suite']);
  });

  it('leaves out a room type that is no longer sold', async () => {
    await createRoomType(app, { name: 'Suite', totalRooms: 0 });

    const { body } = await get(searchPath).expect(200);

    expect(body.data).toEqual([]);
  });

  it('combines with the amenity filter', async () => {
    const suite = await createRoomType(app, {
      name: 'Suite',
      totalRooms: 1,
      amenities: ['wifi', 'tv'],
    });
    await createRoomType(app, {
      name: 'Deluxe',
      totalRooms: 1,
      amenities: ['wifi', 'tv'],
    });
    await createRoomType(app, {
      name: 'Economy',
      totalRooms: 1,
      amenities: ['wifi'],
    });
    await hold(suite, 10, 11);

    const { body } = await get(`${searchPath}&amenities=tv`).expect(200);

    expect(names(body)).toEqual(['Deluxe']);
  });

  it('pages the room types that fit, and counts all of them', async () => {
    const full = await createRoomType(app, { name: 'Full', totalRooms: 1 });
    await createRoomType(app, { name: 'A', totalRooms: 1 });
    await createRoomType(app, { name: 'B', totalRooms: 1 });
    await createRoomType(app, { name: 'C', totalRooms: 1 });
    await hold(full, 10, 13);

    const first = await get(`${searchPath}&perPage=2`).expect(200);
    const second = await get(`${searchPath}&page=2&perPage=2`).expect(200);

    expect(names(first.body)).toEqual(['A', 'B']);
    expect(names(second.body)).toEqual(['C']);
    expect(first.body.meta).toEqual({ total: 3, page: 1, perPage: 2 });
    expect(second.body.meta).toEqual({ total: 3, page: 2, perPage: 2 });
  });

  it.each([
    ['no dates', ''],
    ['no check-out', `?checkInDate=${stay.checkInDate}`],
  ])('refuses a search with %s', async (_, query) => {
    const { body } = await get(`/api/room-types${query}`).expect(400);

    expect(body.message).toContain(
      'checkOutDate: Invalid input: expected string, received undefined',
    );
  });

  it.each(['0', '6', 'abc'])('refuses rooms=%s', async (rooms) => {
    await get(`${searchPath}&rooms=${rooms}`).expect(400);
  });

  it('refuses a stay the booking endpoint would refuse', async () => {
    const { body } = await get(
      `/api/room-types?checkInDate=${day(0)}&checkOutDate=${day(1)}`,
    ).expect(400);

    expect(body.message).toEqual(['checkInDate: Must be tomorrow or later']);
  });
});
