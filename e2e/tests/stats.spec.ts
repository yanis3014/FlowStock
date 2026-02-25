import { test, expect } from '@playwright/test';

test.describe('Statistics page E2E (Story 4.5)', () => {
  let accessToken: string;

  test.beforeAll(async ({ request }) => {
    const csrfRes = await request.get('/csrf-token');
    expect(csrfRes.ok()).toBeTruthy();
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken as string;
    const email = `stats-e2e-${Date.now()}@example.com`;
    const password = 'SecurePass123!';

    const registerRes = await request.post('/auth/register', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      data: {
        email,
        password,
        first_name: 'Stats',
        last_name: 'E2E',
        company_name: `Stats E2E ${Date.now()}`,
      },
    });
    expect(registerRes.ok()).toBeTruthy();
    const registerData = await registerRes.json();
    const verificationToken = registerData.data?.email_verification_token;
    expect(verificationToken).toBeDefined();
    await request.get(`/auth/verify-email?token=${verificationToken}`);

    const loginRes = await request.post('/auth/login', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      data: { email, password },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    accessToken = loginData.data.access_token;
  });

  test('should load statistics page and show ventes hier and stock', async ({ page }) => {
    await page.goto('/stats-page');
    await page.evaluate((token) => {
      localStorage.setItem('bmad_jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForSelector('#statsContent', { state: 'visible', timeout: 10000 });

    await expect(page.locator('#salesAmount')).toBeVisible();
    await expect(page.locator('#salesAmount')).not.toHaveText('-');
    await expect(page.locator('#stockValue')).toBeVisible();
    await expect(page.locator('#stockValue')).not.toHaveText('-');
  });

  test('should show sales chart section and period tabs', async ({ page }) => {
    await page.goto('/stats-page');
    await page.evaluate((token) => {
      localStorage.setItem('bmad_jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForSelector('#statsContent', { state: 'visible', timeout: 10000 });

    await expect(page.locator('#tab7d')).toBeVisible();
    await expect(page.locator('#tab30d')).toBeVisible();
    await expect(page.locator('#salesChart')).toBeVisible();
  });

  test('should show top products section and export button', async ({ page }) => {
    await page.goto('/stats-page');
    await page.evaluate((token) => {
      localStorage.setItem('bmad_jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForSelector('#statsContent', { state: 'visible', timeout: 10000 });

    await expect(page.locator('#topProductsTable')).toBeVisible();
    await expect(page.locator('#exportCsvBtn')).toBeVisible();
  });
});
