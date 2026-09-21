import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { setupSwagger } from './common/swagger/setup-swagger.js';

import type { Env } from './config/env.schema.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  setupSwagger(app);
  const config = app.get(ConfigService<Env, true>);
  await app.listen(config.get('PORT'));
}
await bootstrap();
