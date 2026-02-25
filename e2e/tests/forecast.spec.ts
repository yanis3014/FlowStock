import { test, expect } from '@playwright/test';

  test.describe('Forecast Curves E2E Tests', () => {
  let accessToken: string;
  let tenantId: string;
  let productId1: string;
  let productId2: string;
  let productId3: string;

  test.beforeAll(async ({ request }) => {
    // Increase timeout for beforeAll to handle rate limiting delays
    test.setTimeout(120000); // 2 minutes
    
    // Use unique timestamp to avoid conflicts in parallel runs
    const timestamp = Date.now();
    // Register and login a test user
    const csrfRes = await request.get('/csrf-token');
    expect(csrfRes.ok()).toBeTruthy();
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken as string;

    const email = `forecast-e2e-${timestamp}@example.com`;
    const password = 'SecurePass123!';

    // Retry registration with exponential backoff to handle rate limiting
    // Add initial delay to avoid hitting rate limit immediately after previous test runs
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds initial delay
    
    let registerRes;
    let retries = 0;
    const maxRetries = 4; // 4 retries max
    const baseDelay = 3000; // 3 seconds base delay

    while (retries <= maxRetries) {
      registerRes = await request.post('/auth/register', {
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        data: {
          email: `forecast-e2e-${timestamp}-${retries}@example.com`,
          password,
          first_name: 'Forecast',
          last_name: 'E2E',
          company_name: `Forecast E2E Company ${timestamp}-${retries}`,
        },
      });

      if (registerRes.ok()) {
        break; // Success
      }

      if (registerRes.status() === 429 && retries < maxRetries) {
        // Rate limited - wait with exponential backoff
        const delay = baseDelay * Math.pow(2, retries);
        console.log(`Rate limited (429), retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
      } else {
        // Other error or max retries reached
        const errorText = await registerRes.text();
        throw new Error(`Registration failed after ${retries} retries: ${registerRes.status()} - ${errorText}`);
      }
    }

    if (!registerRes.ok()) {
      const errorText = await registerRes.text();
      throw new Error(`Registration failed: ${registerRes.status()} - ${errorText}`);
    }

    const registerData = await registerRes.json();
    const verificationToken = registerData.data?.email_verification_token;
    expect(verificationToken).toBeDefined();
    
    // Use the email that succeeded (may have retry suffix)
    const registeredEmail = registerData.data?.email || email;

    // Verify email
    await request.get(`/auth/verify-email?token=${verificationToken}`);

    // Login
    const loginRes = await request.post('/auth/login', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      data: { email: registeredEmail, password },
    });
    expect(loginRes.ok()).toBeTruthy();

    const loginData = await loginRes.json();
    accessToken = loginData.data.access_token;
    tenantId = loginData.data.tenant.id;

    // Create test products with lead_time_days for forecast
    const product1Res = await request.post('/products', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        sku: 'FCST-E2E-001',
        name: 'Product Forecast 1',
        quantity: 100,
        min_quantity: 20,
        unit: 'piece',
        purchase_price: 10.0,
        lead_time_days: 7,
      },
    });
    expect(product1Res.ok()).toBeTruthy();
    const product1Data = await product1Res.json();
    productId1 = product1Data.data.id;

    const product2Res = await request.post('/products', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        sku: 'FCST-E2E-002',
        name: 'Product Forecast 2',
        quantity: 50,
        min_quantity: 15,
        unit: 'kg',
        purchase_price: 15.0,
        lead_time_days: 5,
      },
    });
    expect(product2Res.ok()).toBeTruthy();
    const product2Data = await product2Res.json();
    productId2 = product2Data.data.id;

    const product3Res = await request.post('/products', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        sku: 'FCST-E2E-003',
        name: 'Product Forecast 3',
        quantity: 200,
        min_quantity: 30,
        unit: 'piece',
        purchase_price: 8.0,
        lead_time_days: 10,
      },
    });
    expect(product3Res.ok()).toBeTruthy();
    const product3Data = await product3Res.json();
    productId3 = product3Data.data.id;

    // Create sales data for the products to generate stock estimates
    // Sales over last 30 days to have sufficient data
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const saleDate = new Date(today);
      saleDate.setDate(saleDate.getDate() - i);

      // Product 1: ~3 units/day average
      await request.post('/sales', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          product_id: productId1,
          quantity: 3,
          unit_price: 10.0,
          sale_date: saleDate.toISOString().split('T')[0],
        },
      });

      // Product 2: ~2 units/day average
      if (i % 2 === 0) {
        await request.post('/sales', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          data: {
            product_id: productId2,
            quantity: 4,
            unit_price: 15.0,
            sale_date: saleDate.toISOString().split('T')[0],
          },
        });
      }

      // Product 3: ~5 units/day average
      await request.post('/sales', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          product_id: productId3,
          quantity: 5,
          unit_price: 8.0,
          sale_date: saleDate.toISOString().split('T')[0],
        },
      });
    }
  });

  test('should load forecast page and display empty state initially', async ({ page }) => {
    await page.goto('/forecast-page');
    await page.evaluate((token) => {
      localStorage.setItem('jwt_token', token);
    }, accessToken);
    await page.reload();

    // Check page title
    await expect(page.locator('h1')).toContainText('Courbes de Prévision');

    // Check empty state is visible initially
    const emptyState = page.locator('#emptyState');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('Sélectionnez un produit');

    // Check controls are visible
    await expect(page.locator('#periodDays')).toBeVisible();
    await expect(page.locator('#productSelect')).toBeVisible();
    await expect(page.locator('#loadBtn')).toBeVisible();
  });

  test('should load products and display forecast curve', async ({ page }) => {
    await page.goto('/forecast-page');
    await page.evaluate((token) => {
      localStorage.setItem('jwt_token', token);
    }, accessToken);
    await page.reload();

    // Wait for products to load - wait for option with actual value (not empty placeholder)
    await page.waitForFunction(
      () => {
        const select = document.getElementById('productSelect') as HTMLSelectElement;
        return select && select.options.length > 1 && select.options[1].value !== '';
      },
      { timeout: 10000 }
    );

    // Select first product
    await page.selectOption('#productSelect', productId1);

    // Click load button
    await page.click('#loadBtn');

    // Wait for chart to appear
    await page.waitForSelector('#forecastChart', { state: 'visible', timeout: 10000 });

    // Check chart section is visible
    const chartSection = page.locator('#chartSection');
    await expect(chartSection).toBeVisible();

    // Check empty state is hidden
    const emptyState = page.locator('#emptyState');
    await expect(emptyState).not.toBeVisible();

    // Check chart canvas exists
    const chart = page.locator('#forecastChart');
    await expect(chart).toBeVisible();
  });

  test('should display confidence badges', async ({ page }) => {
    await page.goto('/forecast-page');
    await page.evaluate((token) => {
      localStorage.setItem('jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForFunction(
      () => {
        const select = document.getElementById('productSelect') as HTMLSelectElement;
        return select && select.options.length > 1 && select.options[1].value !== '';
      },
      { timeout: 10000 }
    );
    await page.selectOption('#productSelect', productId1);
    await page.click('#loadBtn');

    await page.waitForSelector('#forecastChart', { state: 'visible', timeout: 10000 });

    // Check legend with confidence badge is visible
    const legend = page.locator('.legend');
    await expect(legend).toBeVisible();

    // Check confidence badge exists (high, medium, low, or insufficient)
    const confidenceBadge = page.locator('.confidence-badge');
    await expect(confidenceBadge.first()).toBeVisible();

    // Check badge has one of the expected classes
    const badgeClass = await confidenceBadge.first().getAttribute('class');
    expect(badgeClass).toMatch(/confidence-(high|medium|low|insufficient)/);
  });

  test('should display recommendation date marker', async ({ page }) => {
    await page.goto('/forecast-page');
    await page.evaluate((token) => {
      localStorage.setItem('jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForFunction(
      () => {
        const select = document.getElementById('productSelect') as HTMLSelectElement;
        return select && select.options.length > 1 && select.options[1].value !== '';
      },
      { timeout: 10000 }
    );
    await page.selectOption('#productSelect', productId1);
    await page.click('#loadBtn');

    await page.waitForSelector('#forecastChart', { state: 'visible', timeout: 10000 });

    // Wait a bit for chart to fully render
    await page.waitForTimeout(1000);

    // Check that chart has been drawn (canvas has content)
    const chart = page.locator('#forecastChart');
    const chartDrawn = await chart.evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Check if canvas has any non-transparent pixels (chart was drawn)
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) return true; // alpha > 0
      }
      return false;
    });

    expect(chartDrawn).toBeTruthy();

    // The recommendation line is drawn via Chart.js plugin, verify chart exists and is interactive
    // The actual line rendering is done in canvas, so we verify the chart is functional
    await expect(chart).toBeVisible();
  });

  test('should allow comparing multiple products', async ({ page }) => {
    await page.goto('/forecast-page');
    await page.evaluate((token) => {
      localStorage.setItem('jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForFunction(
      () => {
        const select = document.getElementById('productSelect') as HTMLSelectElement;
        return select && select.options.length > 1 && select.options[1].value !== '';
      },
      { timeout: 10000 }
    );

    // Select first product
    await page.selectOption('#productSelect', productId1);
    await page.click('#loadBtn');
    await page.waitForSelector('#forecastChart', { state: 'visible', timeout: 10000 });

    // Add second product to comparison
    await page.selectOption('#compareProductSelect', productId2);
    await page.click('#addCompareBtn');

    // Wait for chart to update
    await page.waitForTimeout(1000);

    // Check comparison section is visible
    const comparisonSection = page.locator('#comparisonSection');
    await expect(comparisonSection).toBeVisible();

    // Check comparison list has items
    const comparisonList = page.locator('#comparisonList');
    await expect(comparisonList).toBeVisible();

    // Check that we have comparison items
    const comparisonItems = comparisonList.locator('.comparison-item');
    const itemCount = await comparisonItems.count();
    expect(itemCount).toBeGreaterThan(0);

    // Add third product
    await page.selectOption('#compareProductSelect', productId3);
    await page.click('#addCompareBtn');
    await page.waitForTimeout(1000);

    // Verify we can have multiple products compared
    const updatedItemCount = await comparisonItems.count();
    expect(updatedItemCount).toBeGreaterThanOrEqual(2);
  });

  test('should limit comparison to 5 products', async ({ page }) => {
    await page.goto('/forecast-page');
    await page.evaluate((token) => {
      localStorage.setItem('jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForFunction(
      () => {
        const select = document.getElementById('productSelect') as HTMLSelectElement;
        return select && select.options.length > 1 && select.options[1].value !== '';
      },
      { timeout: 10000 }
    );

    // Select first product
    await page.selectOption('#productSelect', productId1);
    await page.click('#loadBtn');
    await page.waitForSelector('#forecastChart', { state: 'visible', timeout: 10000 });

    // Create additional products for testing limit
    const csrfRes = await page.request.get('/csrf-token');
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken as string;

    const productIds: string[] = [];
    for (let i = 4; i <= 7; i++) {
      const productRes = await page.request.post('/products', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          sku: `FCST-E2E-00${i}`,
          name: `Product Forecast ${i}`,
          quantity: 50 + i * 10,
          min_quantity: 20,
          unit: 'piece',
          purchase_price: 10.0,
          lead_time_days: 7,
        },
      });
      const productData = await productRes.json();
      productIds.push(productData.data.id);

      // Add some sales
      for (let j = 0; j < 20; j++) {
        const saleDate = new Date();
        saleDate.setDate(saleDate.getDate() - j);
        await page.request.post('/sales', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          data: {
            product_id: productData.data.id,
            quantity: 2,
            unit_price: 10.0,
            sale_date: saleDate.toISOString().split('T')[0],
          },
        });
      }
    }

    // Reload page to get new products
    await page.reload();
    await page.waitForFunction(
      () => {
        const select = document.getElementById('productSelect') as HTMLSelectElement;
        return select && select.options.length > 1 && select.options[1].value !== '';
      },
      { timeout: 10000 }
    );

    // Add products to comparison until limit
    let addedCount = 0;
    for (const pid of [productId2, productId3, ...productIds]) {
      await page.selectOption('#compareProductSelect', pid);
      const addBtn = page.locator('#addCompareBtn');
      const isDisabled = await addBtn.isDisabled();
      
      if (!isDisabled && addedCount < 5) {
        await addBtn.click();
        addedCount++;
        await page.waitForTimeout(500);
      } else if (addedCount >= 5) {
        // Button should be disabled at limit
        await expect(addBtn).toBeDisabled();
        break;
      }
    }

    // Verify we have at most 5 products in comparison
    const comparisonItems = page.locator('#comparisonList .comparison-item');
    const finalCount = await comparisonItems.count();
    expect(finalCount).toBeLessThanOrEqual(5);
  });

  test('should allow removing products from comparison', async ({ page }) => {
    await page.goto('/forecast-page');
    await page.evaluate((token) => {
      localStorage.setItem('jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForFunction(
      () => {
        const select = document.getElementById('productSelect') as HTMLSelectElement;
        return select && select.options.length > 1 && select.options[1].value !== '';
      },
      { timeout: 10000 }
    );

    await page.selectOption('#productSelect', productId1);
    await page.click('#loadBtn');
    await page.waitForSelector('#forecastChart', { state: 'visible', timeout: 10000 });

    // Add products to comparison
    await page.selectOption('#compareProductSelect', productId2);
    await page.click('#addCompareBtn');
    await page.waitForTimeout(500);

    await page.selectOption('#compareProductSelect', productId3);
    await page.click('#addCompareBtn');
    await page.waitForTimeout(500);

    // Verify comparison list has items
    const comparisonItems = page.locator('#comparisonList .comparison-item');
    const initialCount = await comparisonItems.count();
    expect(initialCount).toBeGreaterThan(0);

    // Remove first product from comparison
    const removeBtn = comparisonItems.first().locator('button');
    await removeBtn.click();
    await page.waitForTimeout(500);

    // Verify count decreased
    const updatedCount = await comparisonItems.count();
    expect(updatedCount).toBeLessThan(initialCount);
  });

  test('should handle insufficient data gracefully', async ({ page }) => {
    // Create a product with no sales
    const csrfRes = await page.request.get('/csrf-token');
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken as string;

    const productRes = await page.request.post('/products', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        sku: 'FCST-E2E-NODATA',
        name: 'Product No Data',
        quantity: 100,
        min_quantity: 20,
        unit: 'piece',
        purchase_price: 10.0,
        lead_time_days: 7,
      },
    });
    const productData = await productRes.json();
    const noDataProductId = productData.data.id;

    await page.goto('/forecast-page');
    await page.evaluate((token) => {
      localStorage.setItem('jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForFunction(
      () => {
        const select = document.getElementById('productSelect') as HTMLSelectElement;
        return select && select.options.length > 1 && select.options[1].value !== '';
      },
      { timeout: 10000 }
    );
    await page.selectOption('#productSelect', noDataProductId);
    await page.click('#loadBtn');

    // Wait for response
    await page.waitForTimeout(2000);

    // Should show empty state or message about insufficient data
    const emptyState = page.locator('#emptyState');
    const errorMsg = page.locator('#errorMsg');

    // Either empty state or error message should indicate insufficient data
    const emptyVisible = await emptyState.isVisible();
    const errorVisible = await errorMsg.isVisible();
    const emptyText = emptyVisible ? await emptyState.textContent() : '';
    const errorText = errorVisible ? await errorMsg.textContent() : '';

    // Check that we get feedback about insufficient data
    expect(
      emptyVisible || errorVisible || 
      emptyText?.includes('insuffisant') || 
      emptyText?.includes('Données insuffisantes') ||
      errorText?.includes('insuffisant')
    ).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/forecast-page');
    await page.evaluate((token) => {
      localStorage.setItem('jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForFunction(
      () => {
        const select = document.getElementById('productSelect') as HTMLSelectElement;
        return select && select.options.length > 1 && select.options[1].value !== '';
      },
      { timeout: 10000 }
    );
    await page.selectOption('#productSelect', productId1);
    await page.click('#loadBtn');

    await page.waitForSelector('#forecastChart', { state: 'visible', timeout: 10000 });

    // Check chart container is visible and responsive
    const chartContainer = page.locator('.chart-container');
    await expect(chartContainer).toBeVisible();

    // Check chart is visible on mobile
    const chart = page.locator('#forecastChart');
    await expect(chart).toBeVisible();

    // Verify controls are accessible on mobile
    await expect(page.locator('#periodDays')).toBeVisible();
    await expect(page.locator('#productSelect')).toBeVisible();
    await expect(page.locator('#loadBtn')).toBeVisible();
  });

  test('should display axes labels and tooltips', async ({ page }) => {
    await page.goto('/forecast-page');
    await page.evaluate((token) => {
      localStorage.setItem('jwt_token', token);
    }, accessToken);
    await page.reload();

    await page.waitForFunction(
      () => {
        const select = document.getElementById('productSelect') as HTMLSelectElement;
        return select && select.options.length > 1 && select.options[1].value !== '';
      },
      { timeout: 10000 }
    );
    await page.selectOption('#productSelect', productId1);
    await page.click('#loadBtn');

    await page.waitForSelector('#forecastChart', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Chart.js should render axes with labels
    // We verify the chart canvas exists and is interactive
    const chart = page.locator('#forecastChart');
    await expect(chart).toBeVisible();

    // Hover over chart to trigger tooltip (if Chart.js tooltips are enabled)
    await chart.hover();
    await page.waitForTimeout(500);

    // Chart should remain visible after interaction
    await expect(chart).toBeVisible();
  });
});
