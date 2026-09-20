import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Todos los tests viven en src/tests/<entidad>.test.ts
    include: ['src/tests/**/*.test.ts'],
  },
});
