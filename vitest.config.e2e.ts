import { existsSync } from 'node:fs';

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Local runs read `.env` (docker stack); CI injects its own variables and
// has no `.env`, so existing values are never overridden.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
