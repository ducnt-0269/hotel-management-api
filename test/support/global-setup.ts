import { execSync } from 'node:child_process';

// Runs once before the e2e files: builds and applies pending migrations to
// the test database. Refuses to run against anything not named *_test.
export default function globalSetup() {
  const db = process.env.DB_NAME ?? '';
  if (!db.endsWith('_test')) {
    throw new Error(
      `e2e refuses to run against DB_NAME="${db}" (expected *_test)`,
    );
  }
  execSync('npm run migration:run', { stdio: 'inherit' });
}
