import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Module } from '@nestjs/common';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';

import { AuthModule } from './auth/auth.module.js';
import { AppConfigModule } from './config/app-config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { MailModule } from './mail/mail.module.js';
import { UsersModule } from './users/users.module.js';

const here = fileURLToPath(new URL('.', import.meta.url));

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: { path: join(here, 'i18n'), watch: false },
      resolvers: [AcceptLanguageResolver],
    }),
    HealthModule,
    MailModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
