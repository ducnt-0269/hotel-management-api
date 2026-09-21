import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { buildTypeOrmOptions } from './typeorm-options.js';

import type { Env } from '../config/env.schema.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...buildTypeOrmOptions({
          DB_HOST: config.get('DB_HOST'),
          DB_PORT: config.get('DB_PORT'),
          DB_USERNAME: config.get('DB_USERNAME'),
          DB_PASSWORD: config.get('DB_PASSWORD'),
          DB_NAME: config.get('DB_NAME'),
        }),
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
