import request from 'supertest';

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

import type { INestApplication } from '@nestjs/common';

describe('admin room types (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let guestToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDb(app);
    const admin = await createUser(app, { role: 'admin' });
    const guest = await createUser(app);
    adminToken = await signIn(app, admin.email, DEFAULT_PASSWORD);
    guestToken = await signIn(app, guest.email, DEFAULT_PASSWORD);
  });

  const http = () => request(app.getHttpServer());
  const ids = (body: { data: { id: number }[] }) =>
    body.data.map((item) => item.id);

  const validBody = {
    name: 'Deluxe Sea View',
    description: 'Balcony over the bay',
    pricePerNight: 1_500_000,
    totalRooms: 3,
  };

  it('refuses guests and anonymous callers on every route', async () => {
    const roomType = await createRoomType(app);
    const routes = [
      () => http().get('/api/admin/room-types'),
      () => http().post('/api/admin/room-types').send(validBody),
      () => http().patch(`/api/admin/room-types/${roomType.id}`).send({}),
      () => http().delete(`/api/admin/room-types/${roomType.id}`),
    ];

    for (const route of routes) {
      await route().expect(401);
      await route().set('Authorization', guestToken).expect(403);
    }
  });

  describe('GET /admin/room-types', () => {
    const get = (query = '') =>
      http()
        .get(`/api/admin/room-types${query}`)
        .set('Authorization', adminToken);

    it('lists every room type by id with its room count, even those off sale', async () => {
      const first = await createRoomType(app, {
        totalRooms: 4,
        amenities: ['wifi'],
      });
      const offSale = await createRoomType(app, { totalRooms: 0 });

      const res = await get().expect(200);

      expect(res.body.meta).toEqual({ total: 2, page: 1, perPage: 20 });
      expect(ids(res.body)).toEqual([Number(first.id), Number(offSale.id)]);
      expect(res.body.data[0]).toEqual({
        id: Number(first.id),
        name: first.name,
        description: first.description,
        pricePerNight: Number(first.pricePerNight),
        totalRooms: 4,
        amenities: [{ id: expect.any(Number), code: 'wifi' }],
        createdAt: first.createdAt.toISOString(),
        updatedAt: first.updatedAt.toISOString(),
      });
      expect(res.body.data[1].totalRooms).toBe(0);
    });

    it('keeps only room types carrying every amenity asked for', async () => {
      const both = await createRoomType(app, { amenities: ['wifi', 'tv'] });
      await createRoomType(app, { amenities: ['wifi'] });

      const res = await get('?amenities=wifi&amenities=tv').expect(200);

      expect(ids(res.body)).toEqual([Number(both.id)]);
      expect(res.body.meta.total).toBe(1);
    });

    it('searches the name case-insensitively, wildcards taken literally', async () => {
      const match = await createRoomType(app, { name: 'Deluxe 50% Off' });
      await createRoomType(app, { name: 'Deluxe 500 Off' });

      const res = await get('?q=deluxe%2050%25').expect(200);

      expect(ids(res.body)).toEqual([Number(match.id)]);
    });

    it('pages through the list', async () => {
      await createRoomType(app);
      const second = await createRoomType(app);

      const res = await get('?page=2&perPage=1').expect(200);

      expect(ids(res.body)).toEqual([Number(second.id)]);
      expect(res.body.meta).toEqual({ total: 2, page: 2, perPage: 1 });
    });
  });

  describe('POST /admin/room-types', () => {
    const post = (body: object) =>
      http()
        .post('/api/admin/room-types')
        .set('Authorization', adminToken)
        .send(body);

    it('creates a room type with its amenities', async () => {
      await createAmenity(app, { code: 'wifi' });
      await createAmenity(app, { code: 'view_sea' });

      const res = await post({
        ...validBody,
        name: '  Deluxe Sea View  ',
        amenities: ['view_sea', 'wifi', 'wifi'],
      }).expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        ...validBody,
        amenities: [
          { id: expect.any(Number), code: 'view_sea' },
          { id: expect.any(Number), code: 'wifi' },
        ],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      await http().get(`/api/room-types/${res.body.id}`).expect(200);
    });

    it('creates a room type without amenities', async () => {
      const res = await post(validBody).expect(201);

      expect(res.body.amenities).toEqual([]);
    });

    it('refuses a name already taken', async () => {
      await createRoomType(app, { name: validBody.name });

      const res = await post(validBody).expect(409);

      expect(res.body.message).toBe('Room type name already exists');
    });

    it('names every amenity code the catalogue does not hold', async () => {
      await createAmenity(app, { code: 'wifi' });

      const res = await post({
        ...validBody,
        amenities: ['wifi', 'jacuzzi', 'sauna'],
      }).expect(400);

      expect(res.body.message).toBe('Unknown amenities: jacuzzi, sauna');
    });

    it.each([
      ['a blank name', { name: '   ' }],
      ['a blank description', { description: '' }],
      ['a free room', { pricePerNight: 0 }],
      ['a fractional price', { pricePerNight: 1.5 }],
      ['a price past a safe integer', { pricePerNight: 2 ** 53 }],
      ['a negative room count', { totalRooms: -1 }],
      ['a room count past a Postgres integer', { totalRooms: 2 ** 31 }],
    ])('refuses %s', async (_, override) => {
      await post({ ...validBody, ...override }).expect(400);
    });
  });

  describe('DELETE /admin/room-types/:id', () => {
    const remove = (id: string | number) =>
      http()
        .delete(`/api/admin/room-types/${id}`)
        .set('Authorization', adminToken);

    it('deletes a room type and its amenity links', async () => {
      const roomType = await createRoomType(app, { amenities: ['wifi'] });

      await remove(roomType.id).expect(204);

      await http().get(`/api/room-types/${roomType.id}`).expect(404);
    });

    it('refuses a room type that booking requests point at', async () => {
      const roomType = await createRoomType(app);
      await createBookingRequest(app, {
        user: await createUser(app),
        roomType,
        checkInDate: '2030-01-10',
        checkOutDate: '2030-01-12',
        status: 'rejected',
      });

      const res = await remove(roomType.id).expect(409);

      expect(res.body.message).toBe('Room type has booking requests');
    });

    it('returns 404 for an unknown room type', async () => {
      await remove(999_999).expect(404);
    });
  });
});
