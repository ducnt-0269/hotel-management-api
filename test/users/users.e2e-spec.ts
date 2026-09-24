import request from 'supertest';

import { signIn } from '../support/auth.js';
import { createTestApp } from '../support/create-test-app.js';
import { createUser } from '../support/factories/user.factory.js';
import { resetDb } from '../support/reset-db.js';

import type { INestApplication } from '@nestjs/common';

describe('me (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(() => resetDb(app));

  it('returns the signed-in user, without the password hash', async () => {
    const user = await createUser(app);
    const authorization = await signIn(app, user.email, user.password);

    const res = await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', authorization)
      .expect(200);

    expect(res.body).toEqual({
      id: Number(user.id),
      email: user.email,
      fullName: user.fullName,
      role: 'user',
      status: 'active',
      createdAt: expect.any(String),
    });
  });

  it('refuses an anonymous request', async () => {
    await request(app.getHttpServer()).get('/api/me').expect(401);
  });

  it('updates the full name', async () => {
    const user = await createUser(app);
    const authorization = await signIn(app, user.email, user.password);

    const res = await request(app.getHttpServer())
      .patch('/api/me')
      .set('Authorization', authorization)
      .send({ fullName: 'Trần Thị Bình' })
      .expect(200);

    expect(res.body.fullName).toBe('Trần Thị Bình');
  });

  it('changes the password, and the old one stops working', async () => {
    const user = await createUser(app);
    const authorization = await signIn(app, user.email, user.password);
    const newPassword = 'BrandNewPass1';

    await request(app.getHttpServer())
      .put('/api/me/password')
      .set('Authorization', authorization)
      .send({ currentPassword: user.password, newPassword })
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(401);

    await signIn(app, user.email, newPassword);
  });

  it('refuses a password change when the current password is wrong', async () => {
    const user = await createUser(app);
    const authorization = await signIn(app, user.email, user.password);

    await request(app.getHttpServer())
      .put('/api/me/password')
      .set('Authorization', authorization)
      .send({ currentPassword: 'NotMyPassword1', newPassword: 'BrandNewPass1' })
      .expect(401);
  });
});
