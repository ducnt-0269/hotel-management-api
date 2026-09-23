import request from 'supertest';

import { createTestApp } from './support/create-test-app.js';
import { createRoomType } from './support/factories/room-type.factory.js';
import { resetDb } from './support/reset-db.js';

import type { INestApplication } from '@nestjs/common';

// Every filter on the room type list, and the combinations between them. Split
// from room-types.e2e-spec.ts to keep both files under the size ceiling — by
// feature, not by query parameter, so a new filter adds cases here instead of
// another file.
describe('room type search (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(() => resetDb(app));

  const get = (path: string) => request(app.getHttpServer()).get(path);

  const names = (body: { data: { name: string }[] }) =>
    body.data.map((roomType) => roomType.name);

  const seedTwo = async () => {
    await createRoomType(app, {
      name: 'Suite',
      amenities: ['wifi', 'tv', 'balcony'],
    });
    await createRoomType(app, { name: 'Economy', amenities: ['wifi'] });
  };

  it('requires every code given (AND), not any of them', async () => {
    await seedTwo();

    const { body } = await get(
      '/api/room-types?amenities=wifi&amenities=tv',
    ).expect(200);

    expect(names(body)).toEqual(['Suite']);
  });

  it('matches nothing when no room type carries the whole set', async () => {
    await seedTwo();

    const { body } = await get(
      '/api/room-types?amenities=wifi&amenities=bathtub',
    ).expect(200);

    expect(body).toEqual({
      data: [],
      meta: { total: 0, page: 1, perPage: 20 },
    });
  });

  it('accepts the single-value form', async () => {
    await seedTwo();

    const { body } = await get('/api/room-types?amenities=wifi').expect(200);

    expect(names(body)).toEqual(['Suite', 'Economy']);
  });

  it('ignores duplicate codes', async () => {
    await seedTwo();

    const { body } = await get(
      '/api/room-types?amenities=wifi&amenities=wifi',
    ).expect(200);

    expect(names(body)).toEqual(['Suite', 'Economy']);
  });

  it('returns an empty page for a code the catalogue does not hold', async () => {
    await seedTwo();

    const { body } = await get('/api/room-types?amenities=jacuzzi').expect(200);

    expect(body).toEqual({
      data: [],
      meta: { total: 0, page: 1, perPage: 20 },
    });
  });

  it('treats an empty value as no filter', async () => {
    await seedTwo();

    const { body } = await get('/api/room-types?amenities=').expect(200);

    expect(names(body)).toEqual(['Suite', 'Economy']);
  });

  it('does not truncate a matched room type to the codes filtered on', async () => {
    await seedTwo();

    const { body } = await get('/api/room-types?amenities=wifi').expect(200);

    expect(body.data[0].amenities).toEqual([
      { id: expect.any(Number), code: 'balcony' },
      { id: expect.any(Number), code: 'tv' },
      { id: expect.any(Number), code: 'wifi' },
    ]);
  });

  it('counts every match, not just the page', async () => {
    await createRoomType(app, { name: 'A', amenities: ['wifi'] });
    await createRoomType(app, { name: 'B', amenities: ['wifi'] });
    await createRoomType(app, { name: 'C', amenities: ['wifi'] });

    const first = await get('/api/room-types?amenities=wifi&perPage=2').expect(
      200,
    );
    const second = await get(
      '/api/room-types?amenities=wifi&page=2&perPage=2',
    ).expect(200);

    expect(names(first.body)).toEqual(['A', 'B']);
    expect(names(second.body)).toEqual(['C']);
    // The count is of every match, not of the page, on both pages.
    expect(first.body.meta).toEqual({ total: 3, page: 1, perPage: 2 });
    expect(second.body.meta).toEqual({ total: 3, page: 2, perPage: 2 });
  });
});
