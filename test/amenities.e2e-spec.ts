import request from 'supertest';

import { createTestApp } from './support/create-test-app.js';
import { createAmenity } from './support/factories/amenity.factory.js';
import { resetDb } from './support/reset-db.js';

import type { INestApplication } from '@nestjs/common';

describe('amenities (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(() => resetDb(app));

  const get = (path: string) => request(app.getHttpServer()).get(path);

  // No `Authorization` header anywhere in this file: the route is public.
  it('returns the amenities a search can filter by, sorted by code', async () => {
    const wifi = await createAmenity(app, { code: 'wifi' });
    const airConditioning = await createAmenity(app, {
      code: 'air_conditioning',
    });
    const viewSea = await createAmenity(app, { code: 'view_sea' });

    const { body } = await get('/api/amenities').expect(200);

    // Ids asserted exactly, so a mapping that paired the wrong id with a code
    // would fail here rather than pass on `expect.any(Number)`.
    expect(body).toEqual({
      data: [
        { id: Number(airConditioning.id), code: 'air_conditioning' },
        { id: Number(viewSea.id), code: 'view_sea' },
        { id: Number(wifi.id), code: 'wifi' },
      ],
      meta: { total: 3, page: 1, perPage: 20 },
    });
  });

  it('returns an empty catalogue rather than failing', async () => {
    const { body } = await get('/api/amenities').expect(200);

    expect(body).toEqual({
      data: [],
      meta: { total: 0, page: 1, perPage: 20 },
    });
  });

  it('paginates like every other list', async () => {
    await createAmenity(app, { code: 'wifi' });
    await createAmenity(app, { code: 'air_conditioning' });
    await createAmenity(app, { code: 'view_sea' });

    const { body } = await get('/api/amenities?page=2&perPage=2').expect(200);

    expect(body).toEqual({
      data: [{ id: expect.any(Number), code: 'wifi' }],
      meta: { total: 3, page: 2, perPage: 2 },
    });
  });
});
