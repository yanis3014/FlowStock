import { test, expect } from '@playwright/test';

/** Utilise baseURL du config Playwright (port 3001 en E2E pour éviter conflit avec 3000) */
test.describe('Authentication Flow E2E', () => {
  test('should register a new user', async ({ request }) => {
    const csrfRes = await request.get('/csrf-token');
    expect(csrfRes.ok(), `GET /csrf-token failed: ${await csrfRes.text()}`).toBeTruthy();
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken as string;
    const cookies = await csrfRes.headers()['set-cookie'];

    const email = `e2e-${Date.now()}@example.com`;
    const res = await request.post('/auth/register', {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        ...(cookies ? { Cookie: Array.isArray(cookies) ? cookies.join('; ') : cookies } : {}),
      },
      data: {
        email,
        password: 'SecurePass123!',
        first_name: 'E2E',
        last_name: 'User',
        company_name: `E2E Company ${Date.now()}`,
      },
    });

    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data?.access_token).toBeDefined();
    expect(data.data?.tenant?.id).toBeDefined();
  });

  test('should reject invalid credentials at login', async ({ request }) => {
    const csrfRes = await request.get('/csrf-token');
    expect(csrfRes.ok()).toBeTruthy();
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken as string;

    const res = await request.post('/auth/login', {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      },
    });

    expect(res.status()).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  test('should login after register', async ({ request }) => {
    const csrfRes = await request.get('/csrf-token');
    expect(csrfRes.ok()).toBeTruthy();
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken as string;

    const email = `e2e-login-${Date.now()}@example.com`;
    const password = 'SecurePass123!';

    const registerRes = await request.post('/auth/register', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      data: {
        email,
        password,
        first_name: 'Login',
        last_name: 'Test',
        company_name: `Login Company ${Date.now()}`,
      },
    });
    expect(registerRes.ok()).toBeTruthy();

    const registerData = await registerRes.json();
    const verificationToken = registerData.data?.email_verification_token;
    expect(verificationToken, 'E2E needs email_verification_token in test env').toBeDefined();

    const verifyRes = await request.get(`/auth/verify-email?token=${verificationToken}`);
    expect(verifyRes.ok(), `verify-email failed: ${await verifyRes.text()}`).toBeTruthy();

    const loginRes = await request.post('/auth/login', {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: { email, password },
    });

    expect(loginRes.ok(), `login failed (${loginRes.status()}): ${await loginRes.text()}`).toBeTruthy();
    const loginData = await loginRes.json();
    expect(loginData.success).toBe(true);
    expect(loginData.data?.access_token).toBeDefined();
  });
});
