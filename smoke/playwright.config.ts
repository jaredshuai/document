import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Docker smoke tests.
 * Tests run against the Docker container serving the app on port 8080.
 */
export default defineConfig({
  testDir: './smoke',
  timeout: 60000, // 60 seconds per test
  fullyParallel: false, // Run tests sequentially to avoid resource contention
  forbidOnly: !!process.env.CI, // Fail if tests are skipped (only in CI)
  retries: process.env.CI ? 1 : 0, // Retry failed tests once in CI
  workers: 1, // Single worker for stability
  reporter: [['list'], ['html', { open: 'never' }]],
  
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: undefined, // Docker container should already be running
});
