import request from 'supertest';
import { DataSource } from 'typeorm';

import { UserReactivation } from '../../../src/users/reactivation/user-reactivation.entity.js';
import { signIn } from '../../support/auth.js';
import { createTestApp } from '../../support/create-test-app.js';
import { createUser } from '../../support/factories/user.factory.js';
import { resetDb } from '../../support/reset-db.js';

import type { User } from '../../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

describe('admin user reactivation (e2e)', () => {
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
      await api().post('/api/admin/users/1/reactivation').expect(401);
    });

    it('refuses a guest', async () => {
      const guest = await createUser(app);
      const auth = await signIn(app, guest.email, guest.password);

      await api()
        .post(`/api/admin/users/${admin.id}/reactivation`)
        .set('Authorization', auth)
        .expect(403);
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
