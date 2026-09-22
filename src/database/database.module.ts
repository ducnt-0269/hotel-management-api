import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EnvService } from '../config/env.service.js';
import { buildTypeOrmOptions } from './typeorm-options.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [EnvService],
      useFactory: (envService: EnvService) => ({
        ...buildTypeOrmOptions({
          DB_HOST: envService.get('DB_HOST'),
          DB_PORT: envService.get('DB_PORT'),
          DB_USERNAME: envService.get('DB_USERNAME'),
          DB_PASSWORD: envService.get('DB_PASSWORD'),
          DB_NAME: envService.get('DB_NAME'),
        }),
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
