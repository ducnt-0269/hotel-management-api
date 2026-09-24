import request from 'supertest';
import { DataSource } from 'typeorm';

import { hashActivationToken } from '../../src/auth/activation-token.js';
import { UserEmailVerificationToken } from '../../src/auth/entities/user-email-verification-token.entity.js';
import { signIn } from '../support/auth.js';
import { createTestApp } from '../support/create-test-app.js';
import {
  createUser,
  DEFAULT_PASSWORD,
} from '../support/factories/user.factory.js';
import { clearMailbox, waitForMail } from '../support/mailpit.js';
import { resetDb } from '../support/reset-db.js';

import type { INestApplication } from '@nestjs/common';

const PASSWORD = 'Password123';

function newEmail(): string {
  return `register-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function activationTokenFrom(body: string): string {
  const match = /activate\?token=([a-f0-9]{64})/.exec(body);
  if (!match) throw new Error(`No activation link in mail body:\n${body}`);
  return match[1];
}

describe('auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDb(app);
    await clearMailbox();
  });

  function register(email: string, password = PASSWORD) {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, fullName: 'Nguyễn Văn An' });
  }

  it('registers, mails the activation link, activates, then signs in', async () => {
    const email = newEmail();

    const registered = await register(email).expect(201);
    expect(registered.body).toEqual({
      id: expect.any(Number),
      email,
      fullName: 'Nguyễn Văn An',
      role: 'user',
      status: 'unverified',
      createdAt: expect.any(String),
    });
    expect(JSON.stringify(registered.body)).not.toContain(PASSWORD);

    const mail = await waitForMail(email);
    const token = activationTokenFrom(mail.Text);

    const activated = await request(app.getHttpServer())
      .get(`/api/auth/activate?token=${token}`)
      .expect(200);
    expect(activated.body.status).toBe('active');

    const authorization = await signIn(app, email, PASSWORD);
    expect(authorization).toMatch(/^Bearer \S+$/);
  });

  it.each([
    ['vi', 'Kích hoạt tài khoản Hotel Management'],
    ['vi-VN,vi;q=0.9,en;q=0.8', 'Kích hoạt tài khoản Hotel Management'],
    ['en-US', 'Activate your Hotel Management account'],
  ])(
    'writes the activation mail in the language the request asks for (%s)',
    async (acceptLanguage, subject) => {
      const email = newEmail();

      await register(email).set('Accept-Language', acceptLanguage).expect(201);

      expect((await waitForMail(email)).Subject).toBe(subject);
    },
  );

  it.each([['ja'], [undefined]])(
    'falls back to Vietnamese when the request names no language it has (%s)',
    async (acceptLanguage) => {
      const email = newEmail();
      const req = register(email);
      if (acceptLanguage) req.set('Accept-Language', acceptLanguage);

      await req.expect(201);

      expect((await waitForMail(email)).Subject).toBe(
        'Kích hoạt tài khoản Hotel Management',
      );
    },
  );

  it('refuses a second registration with the same email, whatever the case', async () => {
    const email = newEmail();
    await register(email).expect(201);

    await register(email.toUpperCase()).expect(409);
  });

  it('refuses to sign in before activation', async () => {
    const email = newEmail();
    await register(email).expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(403);
  });

  it('refuses the wrong password and an unknown email alike', async () => {
    const user = await createUser(app);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: 'WrongPassword1' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: DEFAULT_PASSWORD })
      .expect(401);
  });

  it('rejects an unknown activation token with 404', async () => {
    await request(app.getHttpServer())
      .get(`/api/auth/activate?token=${'0'.repeat(64)}`)
      .expect(404);
  });

  it('rejects an expired activation token with 409', async () => {
    const email = newEmail();
    await register(email).expect(201);
    const token = activationTokenFrom((await waitForMail(email)).Text);

    await app
      .get(DataSource)
      .getRepository(UserEmailVerificationToken)
      .update(
        { tokenHash: hashActivationToken(token) },
        { expiresAt: new Date(Date.now() - 1000) },
      );

    await request(app.getHttpServer())
      .get(`/api/auth/activate?token=${token}`)
      .expect(409);
  });

  it('rejects a second activation with the same token', async () => {
    const email = newEmail();
    await register(email).expect(201);
    const token = activationTokenFrom((await waitForMail(email)).Text);

    await request(app.getHttpServer())
      .get(`/api/auth/activate?token=${token}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/auth/activate?token=${token}`)
      .expect(404);
  });

  // Two clicks on the activation link — or a mail scanner prefetching it while
  // the user clicks — must not produce a 500 from the UNIQUE index.
  it('settles concurrent activations of the same token', async () => {
    const email = newEmail();
    await register(email).expect(201);
    const token = activationTokenFrom((await waitForMail(email)).Text);

    const responses = await Promise.all([
      request(app.getHttpServer()).get(`/api/auth/activate?token=${token}`),
      request(app.getHttpServer()).get(`/api/auth/activate?token=${token}`),
    ]);
    const statuses = responses.map((res) => res.status).sort((a, b) => a - b);

    expect(statuses[0]).toBe(200);
    expect([404, 409]).toContain(statuses[1]);
  });

  it('logs out with a token and refuses without one', async () => {
    const user = await createUser(app);
    const authorization = await signIn(app, user.email, user.password);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', authorization)
      .expect(204);

    await request(app.getHttpServer()).post('/api/auth/logout').expect(401);
  });
});
