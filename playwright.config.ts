import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for validating the host iframe integration flow.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120000,
  expect: {
    timeout: 30000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 4174',
    port: 4174,
    timeout: 180000,
    reuseExistingServer: false,
  },
});
