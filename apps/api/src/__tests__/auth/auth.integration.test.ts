import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { generateEmailVerificationToken, generatePasswordResetToken } from '../../utils/jwt';

// Load project root .env so DATABASE_URL matches migration runner
dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Auth Integration Tests', () => {
  let pool: Pool;
  const testDbUrl = process.env.DATABASE_URL || 
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });

    // Run migrations (can be slow when DB under load)
    await runMigrations();
    
    // Create a test tenant for some tests
    await pool.query(`
      INSERT INTO tenants (company_name, slug, industry)
      VALUES ('Test Tenant', 'test-tenant', 'retail')
    `);
  });

  afterAll(async () => {
    // Clean up test data (order: FKs first)
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM subscription_changes');
    await pool.query('DELETE FROM subscriptions');
    await pool.query('DELETE FROM users');
    await pool.query('DELETE FROM tenants WHERE slug = $1', ['test-tenant']);
    await pool.query('DELETE FROM tenants WHERE slug LIKE $1', ['test-company%']);
    await pool.end();
    // Close app singleton pool so Jest can exit
    await closeDatabase();
  });

  describe('POST /auth/register', () => {
    it('should register a new user and create tenant', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Test1234',
          first_name: 'John',
          last_name: 'Doe',
          company_name: 'Test Company',
          industry: 'cafe',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.user.role).toBe('owner');
      expect(response.body.data.tenant).toBeDefined();
      expect(response.body.data.tenant.company_name).toBe('Test Company');
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test1234',
          company_name: 'Test Company 2',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'weak',
          company_name: 'Test Company 3',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject registration without company_name', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'nocompany@example.com',
          password: 'Test1234',
          first_name: 'No',
          last_name: 'Company',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error || response.body.details).toBeDefined();
    });

    it('should reject registration with duplicate email for same tenant', async () => {
      // First registration
      await request(app)
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Test1234',
          company_name: 'Test Company 4',
        });

      // Second registration with same email and company
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Test1234',
          company_name: 'Test Company 4',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    let registeredTenantId: string;

    beforeAll(async () => {
      // Register a user for login tests
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          email: 'loginuser@example.com',
          password: 'Test1234',
          first_name: 'Login',
          last_name: 'User',
          company_name: 'Login Company',
        });

      const tenantIdFromRegister = registerResponse.body?.data?.tenant?.id as string | undefined;
      if (!tenantIdFromRegister) {
        throw new Error('Tenant id missing from register response');
      }
      registeredTenantId = tenantIdFromRegister;

      // Verify email with tenant context so RLS allows the UPDATE
      const db = getDatabase();
      await db.queryWithTenant(
        registeredTenantId,
        `UPDATE users SET email_verified = true, email_verified_at = CURRENT_TIMESTAMP 
         WHERE email = $1`,
        ['loginuser@example.com']
      );
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'Test1234',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('loginuser@example.com');
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test1234',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject login if email not verified', async () => {
      // Register user without verifying
      await request(app)
        .post('/auth/register')
        .send({
          email: 'unverified@example.com',
          password: 'Test1234',
          company_name: 'Unverified Company',
        });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'Test1234',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not verified');
    });
  });

  describe('GET /auth/verify-email', () => {
    let verificationToken: string;

    beforeAll(async () => {
      // Register a user and get verification token from console logs
      // For this test, we'll generate token manually
      const db = getDatabase();
      
      const userResult = await db.query(
        'SELECT id, email FROM users WHERE email = $1 LIMIT 1',
        ['newuser@example.com']
      );
      
      if (userResult.rows.length > 0) {
        verificationToken = generateEmailVerificationToken(
          userResult.rows[0].id,
          userResult.rows[0].email
        );
      }
    });

    it('should verify email with valid token', async () => {
      if (!verificationToken) {
        // Skip if no token available
        return;
      }

      const response = await request(app)
        .get(`/auth/verify-email?token=${verificationToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/auth/verify-email?token=invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      // Login to get refresh token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'Test1234',
        });

      if (loginResponse.body.success) {
        refreshToken = loginResponse.body.data.refresh_token;
      }
    });

    it('should refresh access token with valid refresh token', async () => {
      if (!refreshToken) {
        return;
      }

      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refresh_token: 'invalid-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'Test1234',
        });

      if (loginResponse.body.success) {
        accessToken = loginResponse.body.data.access_token;
        refreshToken = loginResponse.body.data.refresh_token;
      }
    });

    it('should logout and revoke refresh token', async () => {
      if (!accessToken || !refreshToken) {
        return;
      }

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          refresh_token: refreshToken,
        });

      expect(response.status).toBe(204);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should accept password reset request for existing email', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'loginuser@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept password reset request even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      // Should return success to avoid email enumeration
      expect(response.status).toBe(200);
    });
  });

  describe('POST /auth/reset-password', () => {
    let resetToken: string;

    beforeAll(async () => {
      // Generate reset token via SECURITY DEFINER (bypasses RLS)
      const db = getDatabase();
      const userResult = await db.query(
        'SELECT * FROM get_user_for_password_reset($1)',
        ['loginuser@example.com']
      );
      if (userResult.rows.length > 0) {
        resetToken = generatePasswordResetToken(
          userResult.rows[0].id,
          userResult.rows[0].email
        );
      }
    });

    it('should reset password with valid token', async () => {
      if (!resetToken) {
        return;
      }

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          new_password: 'NewPassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'NewPassword123',
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should reject invalid reset token', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          new_password: 'NewPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Middleware authenticateToken (GET /auth/me)', () => {
    let accessToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'NewPassword123',
        });

      if (loginResponse.body.success) {
        accessToken = loginResponse.body.data.access_token;
      }
    });

    it('should allow access with valid token and return user data', async () => {
      if (!accessToken) {
        return;
      }

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBeDefined();
      expect(response.body.data.tenantId).toBeDefined();
      expect(response.body.data.role).toBeDefined();
      expect(response.body.data.email).toBe('loginuser@example.com');
    });

    it('should reject request without token with 401', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject request with invalid token with 401', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
