import { existsSync } from 'node:fs';

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// `.env.test` first so it wins (loadEnvFile never overrides existing values),
// then `.env` fills in the rest. CI has no `.env` and injects everything.
for (const file of ['.env.test', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['test/support/global-setup.ts'],
    // Every file shares one Postgres database; run them one at a time.
    fileParallelism: false,
  },
});
