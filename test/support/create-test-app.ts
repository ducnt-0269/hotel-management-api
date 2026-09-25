import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { setupApiDocs } from '../../src/common/api-docs/setup-api-docs.js';

import type { INestApplication } from '@nestjs/common';

// Boots the real AppModule (real Postgres from docker / CI) with the same
// global wiring as `main.ts`.
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication({ rawBody: true });
  configureApp(app);
  setupApiDocs(app);
  await app.init();
  return app;
}
