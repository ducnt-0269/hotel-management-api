import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EnvService } from '../config/env.service.js';
import { buildTypeOrmOptions } from './typeorm-options.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [EnvService],
      useFactory: (env: EnvService) => ({
        ...buildTypeOrmOptions({
          DB_HOST: env.get('DB_HOST'),
          DB_PORT: env.get('DB_PORT'),
          DB_USERNAME: env.get('DB_USERNAME'),
          DB_PASSWORD: env.get('DB_PASSWORD'),
          DB_NAME: env.get('DB_NAME'),
        }),
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
