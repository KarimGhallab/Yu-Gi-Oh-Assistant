import { defineConfig } from 'vitest/config';

/**
 * The client is the only workspace whose tests run in a browser environment, so
 * the DOM environment is scoped to its own project. The package that provides
 * that environment is a dependency of this root configuration, where the
 * environment is named, rather than of a workspace.
 */
export default defineConfig({
  test: {
    isolate: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['apps/*/src/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
          // The client project below owns everything under apps/web, its plain
          // .ts tests included, so this project must not claim them as well.
          exclude: ['apps/web/**']
        }
      },
      {
        extends: true,
        test: {
          name: 'web',
          environment: 'jsdom',
          include: ['apps/web/src/**/*.test.{ts,tsx}'],
          setupFiles: ['apps/web/src/test-setup.ts']
        }
      }
    ]
  }
});
