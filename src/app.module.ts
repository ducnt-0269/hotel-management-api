import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Module } from '@nestjs/common';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';

import { AmenitiesModule } from './amenities/amenities.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AppConfigModule } from './config/app-config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { MailModule } from './mail/mail.module.js';
import { RoomTypesModule } from './room-types/room-types.module.js';
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
    AmenitiesModule,
    RoomTypesModule,
  ],
})
export class AppModule {}
