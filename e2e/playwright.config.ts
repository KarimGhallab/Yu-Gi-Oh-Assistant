import { defineConfig, devices } from '@playwright/test';

/**
 * The end-to-end suite. It drives the built client against the built server,
 * a real index seeded from fixture cards, the real conversation store, and the
 * fake Ollama the harness starts, over HTTP. Three engines, one worker, and one
 * stack, so a run is deterministic and a failure is the product's rather than
 * the runner's.
 */
const CLIENT_ORIGIN = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI === undefined ? 0 : 1,
  reporter:
    process.env.CI === undefined
      ? 'list'
      : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: CLIENT_ORIGIN,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    command: 'node_modules/.bin/tsx stack.ts',
    url: CLIENT_ORIGIN,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
