import request from 'supertest';
import { DataSource } from 'typeorm';

import { UserDeactivation } from '../src/users/entities/user-deactivation.entity.js';
import { UserReactivation } from '../src/users/entities/user-reactivation.entity.js';
import { signIn } from './support/auth.js';
import { createTestApp } from './support/create-test-app.js';
import { createUser } from './support/factories/user.factory.js';
import { resetDb } from './support/reset-db.js';

import type { User } from '../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

describe('user management (e2e)', () => {
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
      await api().get('/api/users').expect(401);
    });

    it('refuses a guest on every route', async () => {
      const guest = await createUser(app);
      const auth = await signIn(app, guest.email, guest.password);

      await api().get('/api/users').set('Authorization', auth).expect(403);
      await api()
        .get(`/api/users/${guest.id}`)
        .set('Authorization', auth)
        .expect(403);
      await api()
        .post(`/api/users/${admin.id}/deactivation`)
        .set('Authorization', auth)
        .expect(403);
      await api()
        .post(`/api/users/${admin.id}/reactivation`)
        .set('Authorization', auth)
        .expect(403);
    });
  });

  describe('GET /users', () => {
    it('lists every account newest first, without password hashes', async () => {
      const guest = await createUser(app, { status: 'unverified' });

      const res = await api()
        .get('/api/users')
        .set('Authorization', adminAuth)
        .expect(200);

      expect(res.body.meta).toEqual({ total: 2, page: 1, perPage: 20 });
      expect(res.body.data.map((u: { id: number }) => u.id)).toEqual([
        Number(guest.id),
        Number(admin.id),
      ]);
      expect(res.body.data[0]).toEqual({
        id: Number(guest.id),
        email: guest.email,
        fullName: guest.fullName,
        role: 'user',
        status: 'unverified',
        createdAt: expect.any(String),
      });
    });

    it('pages through the list', async () => {
      await createUser(app);
      await createUser(app);

      const res = await api()
        .get('/api/users?page=2&perPage=2')
        .set('Authorization', adminAuth)
        .expect(200);

      expect(res.body.meta).toEqual({ total: 3, page: 2, perPage: 2 });
      expect(res.body.data).toHaveLength(1);
    });

    it('filters by status and role', async () => {
      const deactivated = await createUser(app, { status: 'deactivated' });
      await createUser(app);

      const byStatus = await api()
        .get('/api/users?status=deactivated')
        .set('Authorization', adminAuth)
        .expect(200);
      expect(byStatus.body.data.map((u: { id: number }) => u.id)).toEqual([
        Number(deactivated.id),
      ]);

      const byRole = await api()
        .get('/api/users?role=admin')
        .set('Authorization', adminAuth)
        .expect(200);
      expect(byRole.body.data.map((u: { id: number }) => u.id)).toEqual([
        Number(admin.id),
      ]);
    });

    it('searches email and full name case-insensitively', async () => {
      const byName = await createUser(app, { fullName: 'Nguyễn Văn An' });
      const byEmail = await createUser(app, { email: 'nguyen.b@example.com' });
      await createUser(app, { fullName: 'Trần Thị Bình' });

      const res = await api()
        .get('/api/users?q=NGUYỄN')
        .set('Authorization', adminAuth)
        .expect(200);
      expect(res.body.data.map((u: { id: number }) => u.id)).toEqual([
        Number(byName.id),
      ]);

      const email = await api()
        .get('/api/users?q=nguyen.b')
        .set('Authorization', adminAuth)
        .expect(200);
      expect(email.body.data.map((u: { id: number }) => u.id)).toEqual([
        Number(byEmail.id),
      ]);
    });

    it('treats LIKE wildcards in the search as literal text', async () => {
      await createUser(app, { email: 'plain@example.com' });
      const underscored = await createUser(app, {
        email: 'with_underscore@example.com',
      });

      const underscore = await api()
        .get('/api/users?q=_')
        .set('Authorization', adminAuth)
        .expect(200);
      expect(underscore.body.data.map((u: { id: number }) => u.id)).toEqual([
        Number(underscored.id),
      ]);

      const percent = await api()
        .get('/api/users?q=%25')
        .set('Authorization', adminAuth)
        .expect(200);
      expect(percent.body.meta.total).toBe(0);
    });

    it('rejects an unknown status', async () => {
      await api()
        .get('/api/users?status=banned')
        .set('Authorization', adminAuth)
        .expect(400);
    });
  });

  describe('GET /users/:id', () => {
    it('returns one account', async () => {
      const guest = await createUser(app);

      const res = await api()
        .get(`/api/users/${guest.id}`)
        .set('Authorization', adminAuth)
        .expect(200);

      expect(res.body).toMatchObject({ id: Number(guest.id), role: 'user' });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('answers 404 for an unknown id', async () => {
      await api()
        .get('/api/users/999999')
        .set('Authorization', adminAuth)
        .expect(404);
    });
  });

  describe('POST /users/:id/deactivation', () => {
    it('records the deactivation and cuts the user off at once', async () => {
      const guest = await createUser(app);
      const guestAuth = await signIn(app, guest.email, guest.password);

      const res = await api()
        .post(`/api/users/${guest.id}/deactivation`)
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
        .post(`/api/users/${admin.id}/deactivation`)
        .set('Authorization', adminAuth)
        .expect(409);
    });

    it.each(['unverified', 'deactivated'] as const)(
      'refuses a user who is %s',
      async (status) => {
        const guest = await createUser(app, { status });

        await api()
          .post(`/api/users/${guest.id}/deactivation`)
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
        .post('/api/users/999999/deactivation')
        .set('Authorization', adminAuth)
        .expect(404);
    });
  });

  describe('POST /users/:id/reactivation', () => {
    it('restores access, and the account can be switched off again', async () => {
      const guest = await createUser(app);
      await api()
        .post(`/api/users/${guest.id}/deactivation`)
        .set('Authorization', adminAuth)
        .expect(201);

      const res = await api()
        .post(`/api/users/${guest.id}/reactivation`)
        .set('Authorization', adminAuth)
        .expect(201);

      expect(res.body).toEqual({
        userId: Number(guest.id),
        adminUserId: Number(admin.id),
        createdAt: expect.any(String),
      });
      await signIn(app, guest.email, guest.password);

      await api()
        .post(`/api/users/${guest.id}/deactivation`)
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
        .post(`/api/users/${guest.id}/reactivation`)
        .set('Authorization', adminAuth)
        .expect(409);
    });

    it('answers 404 for an unknown id', async () => {
      await api()
        .post('/api/users/999999/reactivation')
        .set('Authorization', adminAuth)
        .expect(404);
    });
  });
});
