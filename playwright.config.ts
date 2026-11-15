import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for VS Studio
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 45000,
  expect: {
    timeout: 8000,
  },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1720, height: 1080 },
      },
    },
  ],
  webServer: [
    {
      command: 'npm --workspace=server run dev',
      url: 'http://127.0.0.1:3030/api/projects',
      reuseExistingServer: !process.env.CI,
      timeout: 15000,
    },
    {
      command: 'npm --workspace=client run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 15000,
    },
  ],
});
