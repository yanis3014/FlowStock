import { defineConfig, devices } from '@playwright/test';

/** Port dédié E2E pour éviter conflit avec un autre service sur 3000 */
const E2E_PORT = process.env.E2E_PORT || '3001';

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
  webServer: {
    command: 'npm run dev',
    cwd: 'apps/api',
    url: `http://localhost:${E2E_PORT}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: { ...process.env, PORT: E2E_PORT },
  },
});
