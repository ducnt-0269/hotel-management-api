import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';

import { envSchema } from './config/env.schema.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';

const here = fileURLToPath(new URL('.', import.meta.url));

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    DatabaseModule,
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: { path: join(here, 'i18n'), watch: false },
      resolvers: [AcceptLanguageResolver],
    }),
    HealthModule,
  ],
})
export class AppModule {}
