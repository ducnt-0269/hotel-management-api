import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { setupApiDocs } from './common/api-docs/setup-api-docs.js';

import type { Env } from './config/env.schema.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  setupApiDocs(app);
  const config = app.get(ConfigService<Env, true>);
  await app.listen(config.get('PORT'));
}
await bootstrap();
