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
    baseURL: 'http://127.0.0.1:3100',
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
      command: 'node --import tsx server/src/index.ts',
      env: { PORT:'3131', STUDIO_HOME:process.cwd()+'/.tmp-e2e/registry', STUDIO_ORIGINS:'http://127.0.0.1:3100' },
      url: 'http://127.0.0.1:3131/api/projects',
      reuseExistingServer: process.env.STUDIO_E2E_REUSE === '1',
      timeout: 15000,
    },
    {
      command: 'npm --workspace=client run dev',
      env: { STUDIO_CLIENT_PORT:'3100', STUDIO_API_URL:'http://127.0.0.1:3131' },
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: process.env.STUDIO_E2E_REUSE === '1',
      timeout: 15000,
    },
  ],
});
