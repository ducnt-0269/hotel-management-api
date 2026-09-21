import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { envSchema } from './env.schema.js';
import { EnvService } from './env.service.js';

// Loads `.env`, validates it against `envSchema` at boot, and exposes
// `EnvService` everywhere without per-module imports.
@Global()
@Module({
  imports: [ConfigModule.forRoot({ validationSchema: envSchema })],
  providers: [EnvService],
  exports: [EnvService],
})
export class AppConfigModule {}
