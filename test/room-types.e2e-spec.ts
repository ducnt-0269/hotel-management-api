import request from 'supertest';

import { createTestApp } from './support/create-test-app.js';
import { createRoomType } from './support/factories/room-type.factory.js';
import { resetDb } from './support/reset-db.js';

import type { INestApplication } from '@nestjs/common';

// No `Authorization` header appears in this file: both routes are public, so
// every case doubles as proof of that.
describe('room types (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(() => resetDb(app));

  const get = (path: string) => request(app.getHttpServer()).get(path);

  const names = (body: { data: { name: string }[] }) =>
    body.data.map((roomType) => roomType.name);

  describe('GET /api/room-types', () => {
    it('serves an empty catalogue', async () => {
      const { body } = await get('/api/room-types').expect(200);

      expect(body).toEqual({
        data: [],
        meta: { total: 0, page: 1, perPage: 20 },
      });
    });

    it('returns the documented shape, with money and ids as integers', async () => {
      await createRoomType(app, {
        name: 'Deluxe Sea View',
        description: 'Phòng 35m² giường king, ban công hướng biển.',
        pricePerNight: 2_200_000,
        totalRooms: 4,
        amenities: ['wifi', 'bed_king', 'view_sea'],
      });

      const { body } = await get('/api/room-types').expect(200);

      expect(body.data).toEqual([
        {
          id: expect.any(Number),
          name: 'Deluxe Sea View',
          description: 'Phòng 35m² giường king, ban công hướng biển.',
          pricePerNight: 2_200_000,
          totalRooms: 4,
          // Alphabetical by code, not the order they were linked in.
          amenities: [
            { id: expect.any(Number), code: 'bed_king' },
            { id: expect.any(Number), code: 'view_sea' },
            { id: expect.any(Number), code: 'wifi' },
          ],
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      ]);
    });

    it('orders by id ascending', async () => {
      await createRoomType(app, { name: 'First' });
      await createRoomType(app, { name: 'Second' });
      await createRoomType(app, { name: 'Third' });

      const { body } = await get('/api/room-types').expect(200);

      const ids: number[] = body.data.map(
        (roomType: { id: number }) => roomType.id,
      );

      expect(names(body)).toEqual(['First', 'Second', 'Third']);
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
    });

    it('paginates', async () => {
      await createRoomType(app, { name: 'First' });
      await createRoomType(app, { name: 'Second' });
      await createRoomType(app, { name: 'Third' });

      const { body } = await get('/api/room-types?page=2&perPage=2').expect(
        200,
      );

      expect(names(body)).toEqual(['Third']);
      expect(body.meta).toEqual({ total: 3, page: 2, perPage: 2 });
    });

    it('returns an empty page past the end rather than an error', async () => {
      await createRoomType(app);

      const { body } = await get('/api/room-types?page=99').expect(200);

      expect(body.data).toEqual([]);
      expect(body.meta.total).toBe(1);
    });

    it.each(['perPage=101', 'perPage=0', 'page=0', 'page=abc'])(
      'rejects ?%s',
      async (query) => {
        await get(`/api/room-types?${query}`).expect(400);
      },
    );
  });

  describe('GET /api/room-types/:id', () => {
    it('returns one room type unwrapped, with no envelope', async () => {
      const created = await createRoomType(app, {
        name: 'Standard Twin',
        description: 'Phòng 22m² với hai giường đơn.',
        pricePerNight: 850_000,
        totalRooms: 10,
        amenities: ['wifi', 'tv'],
      });

      const { body } = await get(`/api/room-types/${created.id}`).expect(200);

      expect(body).toEqual({
        id: Number(created.id),
        name: 'Standard Twin',
        description: 'Phòng 22m² với hai giường đơn.',
        pricePerNight: 850_000,
        totalRooms: 10,
        amenities: [
          { id: expect.any(Number), code: 'tv' },
          { id: expect.any(Number), code: 'wifi' },
        ],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('returns an empty array for a room type with no amenities', async () => {
      const created = await createRoomType(app);

      const { body } = await get(`/api/room-types/${created.id}`).expect(200);

      expect(body.amenities).toEqual([]);
    });

    it('404s on an id that does not exist', async () => {
      await get('/api/room-types/999999').expect(404);
    });

    it('400s on an id that is not a number', async () => {
      await get('/api/room-types/abc').expect(400);
    });
  });
});
