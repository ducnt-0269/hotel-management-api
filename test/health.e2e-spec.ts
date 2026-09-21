import request from 'supertest';

import { createTestApp } from './support/create-test-app.js';

import type { INestApplication } from '@nestjs/common';

describe('health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  it('GET /api/health reaches Postgres', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
