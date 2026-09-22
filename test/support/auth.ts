import request from 'supertest';

import type { INestApplication } from '@nestjs/common';

// Goes through the real endpoint, so every test that needs a token also
// exercises login.
export async function signIn(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return `Bearer ${res.body.accessToken}`;
}
