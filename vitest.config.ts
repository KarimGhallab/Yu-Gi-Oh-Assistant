import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    isolate: true,
    include: ['apps/*/src/**/*.test.ts', 'packages/*/src/**/*.test.ts']
  }
});
