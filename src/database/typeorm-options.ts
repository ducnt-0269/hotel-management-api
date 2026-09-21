import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Env } from '../config/env.schema.js';
import type { DataSourceOptions } from 'typeorm';

export type DatabaseEnv = Pick<
  Env,
  'DB_HOST' | 'DB_PORT' | 'DB_USERNAME' | 'DB_PASSWORD' | 'DB_NAME'
>;

const here = fileURLToPath(new URL('.', import.meta.url));

// Shared by the Nest module and the TypeORM CLI data source so both talk to
// the same database with the same migration set. Schema changes go through
// migrations only (NFR-006), never `synchronize`.
export function buildTypeOrmOptions(env: DatabaseEnv): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    // Compiled migrations only: run via `npm run migration:*` against dist/,
    // never by the app itself (no `migrationsRun`).
    migrations: [join(here, 'migrations', '*.js')],
    synchronize: false,
  };
}
