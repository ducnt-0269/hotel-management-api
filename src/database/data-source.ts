import 'reflect-metadata';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DataSource } from 'typeorm';

import { envSchema } from '../config/env.schema.js';
import { buildTypeOrmOptions } from './typeorm-options.js';

// TypeORM CLI entry (`npm run migration:*`). Runs from `dist/`, so entities
// are discovered by glob; the Nest app uses `autoLoadEntities` instead.
const here = fileURLToPath(new URL('.', import.meta.url));

const env = envSchema
  .pick({
    DB_HOST: true,
    DB_PORT: true,
    DB_USERNAME: true,
    DB_PASSWORD: true,
    DB_NAME: true,
  })
  .parse(process.env);

export default new DataSource({
  ...buildTypeOrmOptions(env),
  entities: [join(here, '..', '**', '*.entity.js')],
});
