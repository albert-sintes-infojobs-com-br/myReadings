import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests-e2e/**/*.e2e.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Un solo proceso: todos los escenarios comparten el mismo servidor levantado en beforeAll.
    fileParallelism: false,
  },
});
