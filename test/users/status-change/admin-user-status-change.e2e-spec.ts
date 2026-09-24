import request from 'supertest';
import { DataSource } from 'typeorm';

import { UserDeactivation } from '../../../src/users/status-change/user-deactivation.entity.js';
import { UserReactivation } from '../../../src/users/status-change/user-reactivation.entity.js';
import { signIn } from '../../support/auth.js';
import { createTestApp } from '../../support/create-test-app.js';
import { createUser } from '../../support/factories/user.factory.js';
import { resetDb } from '../../support/reset-db.js';

import type { User } from '../../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

describe('admin user status change (e2e)', () => {
  let app: INestApplication;
  let admin: User & { password: string };
  let adminAuth: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDb(app);
    admin = await createUser(app, {
      email: 'admin@example.com',
      fullName: 'Quản Trị',
      role: 'admin',
    });
    adminAuth = await signIn(app, admin.email, admin.password);
  });

  const api = () => request(app.getHttpServer());

  describe('access', () => {
    it('refuses an anonymous request', async () => {
      await api().post('/api/admin/users/1/deactivation').expect(401);
    });

    it('refuses a guest on every route', async () => {
      const guest = await createUser(app);
      const auth = await signIn(app, guest.email, guest.password);

      await api()
        .post(`/api/admin/users/${admin.id}/deactivation`)
        .set('Authorization', auth)
        .expect(403);
      await api()
        .post(`/api/admin/users/${admin.id}/reactivation`)
        .set('Authorization', auth)
        .expect(403);
    });
  });

  describe('POST /admin/users/:id/deactivation', () => {
    it('records the deactivation and cuts the user off at once', async () => {
      const guest = await createUser(app);
      const guestAuth = await signIn(app, guest.email, guest.password);

      const res = await api()
        .post(`/api/admin/users/${guest.id}/deactivation`)
        .set('Authorization', adminAuth)
        .expect(201);

      expect(res.body).toEqual({
        userId: Number(guest.id),
        adminUserId: Number(admin.id),
        createdAt: expect.any(String),
      });
      const rows = await app
        .get(DataSource)
        .getRepository(UserDeactivation)
        .findBy({ userId: guest.id });
      expect(rows).toHaveLength(1);

      await api().get('/api/me').set('Authorization', guestAuth).expect(401);
      await api()
        .post('/api/auth/login')
        .send({ email: guest.email, password: guest.password })
        .expect(403);
    });

    it('refuses to deactivate the signed-in admin', async () => {
      await api()
        .post(`/api/admin/users/${admin.id}/deactivation`)
        .set('Authorization', adminAuth)
        .expect(409);
    });

    it.each(['unverified', 'deactivated'] as const)(
      'refuses a user who is %s',
      async (status) => {
        const guest = await createUser(app, { status });

        await api()
          .post(`/api/admin/users/${guest.id}/deactivation`)
          .set('Authorization', adminAuth)
          .expect(409);

        const rows = await app
          .get(DataSource)
          .getRepository(UserDeactivation)
          .countBy({ userId: guest.id });
        expect(rows).toBe(0);
      },
    );

    it('answers 404 for an unknown id', async () => {
      await api()
        .post('/api/admin/users/999999/deactivation')
        .set('Authorization', adminAuth)
        .expect(404);
    });
  });

  describe('POST /admin/users/:id/reactivation', () => {
    it('restores access, and the account can be switched off again', async () => {
      const guest = await createUser(app);
      await api()
        .post(`/api/admin/users/${guest.id}/deactivation`)
        .set('Authorization', adminAuth)
        .expect(201);

      const res = await api()
        .post(`/api/admin/users/${guest.id}/reactivation`)
        .set('Authorization', adminAuth)
        .expect(201);

      expect(res.body).toEqual({
        userId: Number(guest.id),
        adminUserId: Number(admin.id),
        createdAt: expect.any(String),
      });
      await signIn(app, guest.email, guest.password);

      await api()
        .post(`/api/admin/users/${guest.id}/deactivation`)
        .set('Authorization', adminAuth)
        .expect(201);
      const reactivations = await app
        .get(DataSource)
        .getRepository(UserReactivation)
        .countBy({ userId: guest.id });
      expect(reactivations).toBe(1);
    });

    it('refuses a user who is not deactivated', async () => {
      const guest = await createUser(app);

      await api()
        .post(`/api/admin/users/${guest.id}/reactivation`)
        .set('Authorization', adminAuth)
        .expect(409);
    });

    it('answers 404 for an unknown id', async () => {
      await api()
        .post('/api/admin/users/999999/reactivation')
        .set('Authorization', adminAuth)
        .expect(404);
    });
  });
});
