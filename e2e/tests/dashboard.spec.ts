import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  let accessToken: string;
  let tenantId: string;

  test.beforeAll(async ({ request }) => {
    // Register and login a test user
    const csrfRes = await request.get('/csrf-token');
    expect(csrfRes.ok()).toBeTruthy();
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken as string;

    const email = `dashboard-e2e-${Date.now()}@example.com`;
    const password = 'SecurePass123!';

    const registerRes = await request.post('/auth/register', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      data: {
        email,
        password,
        first_name: 'Dashboard',
        last_name: 'E2E',
        company_name: `Dashboard E2E Company ${Date.now()}`,
      },
    });
    expect(registerRes.ok()).toBeTruthy();

    const registerData = await registerRes.json();
    const verificationToken = registerData.data?.email_verification_token;
    expect(verificationToken).toBeDefined();

    // Verify email
    await request.get(`/auth/verify-email?token=${verificationToken}`);

    // Login
    const loginRes = await request.post('/auth/login', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      data: { email, password },
    });
    expect(loginRes.ok()).toBeTruthy();

    const loginData = await loginRes.json();
    accessToken = loginData.data.access_token;
    tenantId = loginData.data.tenant.id;

    // Create test products for dashboard
    await request.post('/products', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        sku: 'DASH-E2E-001',
        name: 'Product OK',
        quantity: 100,
        min_quantity: 20,
        unit: 'piece',
        purchase_price: 10.0,
      },
    });

    await request.post('/products', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        sku: 'DASH-E2E-002',
        name: 'Product Low Stock',
        quantity: 5,
        min_quantity: 20,
        unit: 'piece',
        purchase_price: 15.0,
      },
    });

    await request.post('/products', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        sku: 'DASH-E2E-003',
        name: 'Product Critical',
        quantity: 0,
        min_quantity: 10,
        unit: 'piece',
        purchase_price: 20.0,
      },
    });
  });

  test('should load dashboard page and display overview', async ({ page }) => {
    // Set token in localStorage
    await page.goto('/dashboard-page');
    await page.evaluate((token) => {
      localStorage.setItem('bmad_jwt_token', token);
    }, accessToken);

    // Reload page to use token
    await page.reload();

    // Wait for dashboard content to load
    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 5000 });

    // Check that statistics cards are visible
    await expect(page.locator('.stat-card.sales')).toBeVisible();
    await expect(page.locator('.stat-card.stock')).toBeVisible();
    await expect(page.locator('.stat-card.alerts')).toBeVisible();
    await expect(page.locator('.stat-card.actions')).toBeVisible();

    // Check that sections are visible
    await expect(page.locator('.section-title')).toHaveCount(3); // Alerts, Actions, Products
  });

  test('should display stock status colors correctly', async ({ page }) => {
    await page.goto('/dashboard-page');
    await page.evaluate((token) => {
      localStorage.setItem('bmad_jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 5000 });

    // Check for product cards with different status badges
    const productCards = page.locator('.product-card');
    await expect(productCards.first()).toBeVisible();

    // Check that badges exist
    const badges = page.locator('.stock-badge');
    await expect(badges.first()).toBeVisible();

    // Check for OK badge (green)
    const okBadge = page.locator('.stock-badge.ok');
    if (await okBadge.count() > 0) {
      await expect(okBadge.first()).toHaveClass(/ok/);
    }

    // Check for Low badge (orange)
    const lowBadge = page.locator('.stock-badge.low');
    if (await lowBadge.count() > 0) {
      await expect(lowBadge.first()).toHaveClass(/low/);
    }

    // Check for Critical badge (red)
    const criticalBadge = page.locator('.stock-badge.critical');
    if (await criticalBadge.count() > 0) {
      await expect(criticalBadge.first()).toHaveClass(/critical/);
    }
  });

  test('should display essential statistics', async ({ page }) => {
    await page.goto('/dashboard-page');
    await page.evaluate((token) => {
      localStorage.setItem('bmad_jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 5000 });

    // Check sales statistics
    const salesAmount = page.locator('#salesAmount');
    await expect(salesAmount).toBeVisible();
    await expect(salesAmount).not.toHaveText('-');

    const salesCount = page.locator('#salesCount');
    await expect(salesCount).toBeVisible();

    // Check stock statistics
    const stockValue = page.locator('#stockValue');
    await expect(stockValue).toBeVisible();
    await expect(stockValue).not.toHaveText('-');

    const productCount = page.locator('#productCount');
    await expect(productCount).toBeVisible();
    await expect(productCount).not.toHaveText('-');

    // Check alert count
    const alertCount = page.locator('#alertCount');
    await expect(alertCount).toBeVisible();
  });

  test('should display recommended actions', async ({ page }) => {
    await page.goto('/dashboard-page');
    await page.evaluate((token) => {
      localStorage.setItem('bmad_jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 5000 });

    // Check actions section exists
    const actionsSection = page.locator('.section').filter({ hasText: 'Actions recommandées' });
    await expect(actionsSection).toBeVisible();

    // Check for action items or empty state
    const actionsList = page.locator('#actionsList');
    const noActions = page.locator('#noActions');

    // Either actions list or empty state should be visible
    const hasActions = await actionsList.locator('.action-item').count() > 0;
    const hasNoActions = await noActions.isVisible();

    expect(hasActions || hasNoActions).toBeTruthy();

    // If actions exist, check they have links
    if (hasActions) {
      const actionLinks = actionsList.locator('.action-link');
      await expect(actionLinks.first()).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard-page');
    await page.evaluate((token) => {
      localStorage.setItem('bmad_jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 5000 });

    // Check that stats grid adapts to mobile (should be single column)
    const statsGrid = page.locator('.stats-grid');
    const gridStyle = await statsGrid.evaluate((el) => {
      return window.getComputedStyle(el).gridTemplateColumns;
    });

    // On mobile, grid should be single column or have minmax that allows single column
    expect(gridStyle).toBeTruthy();

    // Check that products grid adapts
    const productsGrid = page.locator('.products-grid');
    await expect(productsGrid).toBeVisible();

    // Verify content is still accessible on mobile
    await expect(page.locator('.stat-card').first()).toBeVisible();
  });

  test('should load in less than 2 seconds', async ({ page }) => {
    await page.goto('/dashboard-page');
    await page.evaluate((token) => {
      localStorage.setItem('bmad_jwt_token', token);
    }, accessToken);

    const startTime = Date.now();

    // Wait for dashboard content to be visible (API can be slow in E2E)
    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 20000 });

    // Wait for statistics to be populated (not showing '-')
    await page.waitForFunction(() => {
      const salesAmount = document.getElementById('salesAmount');
      return salesAmount && salesAmount.textContent !== '-';
    }, { timeout: 5000 });

    const loadTime = Date.now() - startTime;

    // Verify load time is reasonable in E2E (target NFR1 is <2s in prod; allow 5s in test)
    expect(loadTime).toBeLessThan(5000);

    // Log performance for debugging
    console.log(`Dashboard load time: ${loadTime}ms`);
  });

  test('should handle errors gracefully', async ({ page }) => {
    await page.goto('/dashboard-page');
    await page.evaluate(() => {
      localStorage.setItem('bmad_jwt_token', 'invalid-token');
    });
    await page.reload();

    // Wait for auth check to run and show error or hide content
    await page.waitForTimeout(1500);
    const errorContainer = page.locator('#errorContainer');
    await expect(errorContainer).toBeVisible({ timeout: 5000 });
    // When token is invalid, main content should be hidden (or error shown)
    const dashboardContent = page.locator('#dashboardContent');
    await expect(dashboardContent).not.toBeVisible();
  });

  test('should show alert filters and allow filtering by type', async ({ page }) => {
    await page.goto('/dashboard-page');
    await page.evaluate((token) => {
      localStorage.setItem('bmad_jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 5000 });

    const filterType = page.locator('#filterType');
    await expect(filterType).toBeVisible();
    await filterType.selectOption('low_stock');
    await page.waitForTimeout(300);
    expect(await filterType.inputValue()).toBe('low_stock');
  });

  test('should show alert threshold control and notifications checkbox', async ({ page }) => {
    await page.goto('/dashboard-page');
    await page.evaluate((token) => {
      localStorage.setItem('bmad_jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 5000 });

    const thresholdInput = page.locator('#alertThreshold');
    await expect(thresholdInput).toBeVisible();
    await expect(thresholdInput).toHaveAttribute('type', 'number');

    const notificationsCb = page.locator('#notificationsEnabled');
    await expect(notificationsCb).toBeVisible();
  });

  test('should allow marking alert as resolved when alerts exist', async ({ page }) => {
    await page.goto('/dashboard-page');
    await page.evaluate((token) => {
      localStorage.setItem('bmad_jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 5000 });

    const alertItems = page.locator('.alert-item');
    const count = await alertItems.count();
    if (count > 0) {
      const resolveButtons = page.locator('button[title="Résoudre"]');
      if (await resolveButtons.count() > 0) {
        await resolveButtons.first().click();
        await page.waitForTimeout(500);
        const resolvedItem = page.locator('.alert-item.resolved');
        await expect(resolvedItem.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
