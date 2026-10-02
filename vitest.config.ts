import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './tests/test-database';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    // The services' Prisma client reads DATABASE_URL, so point it at the test database.
    env: { DATABASE_URL: testDatabaseUrl() },
    // All test files share one database, so they run one file at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
