import { defineConfig, devices } from '@playwright/test';

/** Port dédié E2E pour éviter conflit avec 3000 (API dev) et 3001 (éventuel autre service) */
const E2E_PORT = process.env.E2E_PORT || '3010';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  /* 1 worker to avoid rate limit (429) on /auth/register when multiple suites register */
  workers: 1,
  webServer: {
    command: 'npm run dev',
    cwd: 'apps/api',
    url: `http://localhost:${E2E_PORT}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: { ...process.env, PORT: E2E_PORT, NODE_ENV: 'test' },
  },
});
