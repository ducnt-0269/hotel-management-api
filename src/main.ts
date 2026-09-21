import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { setupApiDocs } from './common/api-docs/setup-api-docs.js';
import { EnvService } from './config/env.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const env = app.get(EnvService);
  configureApp(app);
  // Docs expose every route and let visitors fire real requests; dev/staging only.
  if (!env.isProduction) setupApiDocs(app);
  await app.listen(env.get('PORT'));
}
await bootstrap();
