import { defineConfig, devices } from '@playwright/test';

/**
 * 15 §2: browser E2E and accessibility tests.
 * 11 §20: `pnpm test:e2e` runs Playwright, `pnpm test:a11y` runs the
 * accessibility flows, and CI blocks merge on critical E2E failures.
 *
 * Both servers are started here so the suite is runnable from a clean checkout.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @us24/api dev',
      url: 'http://127.0.0.1:3001/health',
      reuseExistingServer: true,
      timeout: 60_000,
      cwd: '..',
    },
    {
      command: 'pnpm --filter @us24/web dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
      timeout: 60_000,
      cwd: '..',
    },
  ],
});
