import { DataSource } from 'typeorm';

import type { INestApplication } from '@nestjs/common';

// Empties every table except TypeORM's `migrations`. Call in `beforeEach`
// so each test starts from a clean database.
export async function resetDb(app: INestApplication) {
  const dataSource = app.get(DataSource);
  const rows: { tablename: string }[] = await dataSource.query(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename <> 'migrations'`,
  );
  if (rows.length === 0) return;
  const tables = rows.map((r) => `"${r.tablename}"`).join(', ');
  await dataSource.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}
