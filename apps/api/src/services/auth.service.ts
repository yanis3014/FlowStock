import { getDatabase } from '../database/connection';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  verifyEmailVerificationToken,
  verifyPasswordResetToken,
  verifyToken,
} from '../utils/jwt';
import {
  createTrialSubscriptionForTenant,
  getSubscriptionForAuth,
} from './subscription.service';

export interface RegisterInput {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  industry?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Register a new user and create tenant if needed
 */
export async function registerUser(input: RegisterInput) {
  const db = getDatabase();

  // Validate password strength
  const passwordValidation = validatePasswordStrength(input.password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message || 'Invalid password');
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Start transaction - need to create tenant first, so use regular transaction
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    let tenantId: string;
    let userRole: 'owner' | 'admin' | 'user' = 'user';

    // Create tenant if company_name provided
    if (input.company_name) {
      // Generate slug from company name
      const slug = input.company_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Check if slug already exists
      const existingTenant = await client.query(
        'SELECT id FROM tenants WHERE slug = $1',
        [slug]
      );

      if (existingTenant.rows.length > 0) {
        // Tenant exists, add user to existing tenant
        tenantId = existingTenant.rows[0].id;
        userRole = 'user'; // Not the owner
      } else {
        // Create new tenant
        const tenantResult = await client.query(
          `INSERT INTO tenants (company_name, slug, industry, is_active)
           VALUES ($1, $2, $3, true)
           RETURNING id`,
          [input.company_name, slug, input.industry || null]
        );
        tenantId = tenantResult.rows[0].id;
        userRole = 'owner'; // First user is owner
      }
    } else {
      await client.query('ROLLBACK');
      throw new Error('company_name is required for registration');
    }

    // Set tenant context for RLS
    await client.query('SELECT set_tenant_context($1::uuid)', [tenantId]);

    // Check if email already exists for this tenant
    const existingUser = await client.query(
      'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
      [tenantId, input.email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      throw new Error('Email already exists for this tenant');
    }

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (
        tenant_id, email, password_hash, first_name, last_name, role, is_active, email_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, true, false)
      RETURNING id, tenant_id, email, first_name, last_name, role, email_verified, created_at`,
      [
        tenantId,
        input.email,
        passwordHash,
        input.first_name || null,
        input.last_name || null,
        userRole,
      ]
    );

    const user = userResult.rows[0];

    // Ensure trial subscription exists for this tenant (create if missing)
    const existingSub = await client.query(
      'SELECT id FROM subscriptions WHERE tenant_id = $1',
      [tenantId]
    );
    if (existingSub.rows.length === 0) {
      await createTrialSubscriptionForTenant(client, tenantId);
    }
    const subscriptionRow = await client.query(
      `SELECT tier, status, trial_ends_at FROM subscriptions WHERE tenant_id = $1`,
      [tenantId]
    );
    const sub = subscriptionRow.rows[0];
    const subscription = sub
      ? {
          tier: sub.tier,
          status: sub.status,
          trial_ends_at: sub.trial_ends_at ? new Date(sub.trial_ends_at).toISOString() : null,
        }
      : { tier: 'normal', status: 'trial', trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() };

    // Generate tokens
    const emailVerificationToken = generateEmailVerificationToken(user.id, user.email);
    const accessToken = generateAccessToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      email: user.email,
    });
    const refreshToken = generateRefreshToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      email: user.email,
    });

    // Store refresh token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await client.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, revoked)
       VALUES ($1, $2, $3, false)`,
      [user.id, refreshToken, expiresAt]
    );

    // Get tenant info
    const tenantResult = await client.query(
      'SELECT id, company_name, slug FROM tenants WHERE id = $1',
      [tenantId]
    );
    const tenant = tenantResult.rows[0];

    await client.query('COMMIT');
    client.release();

    // Mock email sending (for MVP)
    console.log(`📧 [MOCK] Email verification sent to ${user.email}`);
    console.log(`   Token: ${emailVerificationToken}`);
    console.log(`   Verification URL: http://localhost:3000/auth/verify-email?token=${emailVerificationToken}`);

    const result = {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        company_name: tenant.company_name,
        slug: tenant.slug,
      },
      subscription,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15 minutes in seconds
    };
    // Expose verification token only in development/test (never in production)
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'development' || nodeEnv === 'test') {
      (result as Record<string, unknown>).email_verification_token = emailVerificationToken;
    }
    return result;
  } catch (error: unknown) {
    await client.query('ROLLBACK').catch(() => {}); // Ignore rollback errors
    client.release();
    const pgErr = error as { code?: string };
    if (pgErr?.code === '23505') {
      throw new Error('Email already exists for this tenant');
    }
    throw error;
  }
}

/**
 * Login user
 */
export async function loginUser(input: LoginInput) {
  const db = getDatabase();

  // Find user by email via SECURITY DEFINER (bypasses RLS when tenant unknown)
  const userResult = await db.query(
    'SELECT * FROM get_user_by_email_for_login($1)',
    [input.email]
  );

  if (userResult.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = userResult.rows[0];

  // Verify password
  const passwordValid = await comparePassword(input.password, user.password_hash);
  if (!passwordValid) {
    throw new Error('Invalid credentials');
  }

  // Check email verified
  if (!user.email_verified) {
    throw new Error('Email not verified. Please verify your email before logging in.');
  }

  // Set tenant context
  await db.query('SELECT set_tenant_context($1::uuid)', [user.tenant_id]);

  // Update last_login_at
  await db.queryWithTenant(
    user.tenant_id,
    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  // Get tenant info
  const tenantResult = await db.query(
    'SELECT id, company_name, slug FROM tenants WHERE id = $1',
    [user.tenant_id]
  );
  const tenant = tenantResult.rows[0];

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
    email: user.email,
  });
  const refreshToken = generateRefreshToken({
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
    email: user.email,
  });

  // Store refresh token in DB (with tenant context for RLS)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await db.queryWithTenant(
    user.tenant_id,
    `INSERT INTO refresh_tokens (user_id, token, expires_at, revoked)
     VALUES ($1, $2, $3, false)`,
    [user.id, refreshToken, expiresAt]
  );

  const subscription = await getSubscriptionForAuth(user.tenant_id);

  return {
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
    },
    tenant: {
      id: tenant.id,
      company_name: tenant.company_name,
      slug: tenant.slug,
    },
    subscription: subscription ?? { tier: 'normal', status: 'trial' },
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 900, // 15 minutes in seconds
  };
}

/**
 * Verify email
 */
export async function verifyEmail(token: string) {
  const db = getDatabase();

  // Verify token
  const { userId, email } = verifyEmailVerificationToken(token);

  // Get tenant_id via SECURITY DEFINER (bypasses RLS)
  const tenantResult = await db.query(
    'SELECT get_tenant_id_for_user($1) AS tenant_id',
    [userId]
  );

  if (tenantResult.rows.length === 0 || !tenantResult.rows[0].tenant_id) {
    throw new Error('User not found');
  }

  const tenantId = tenantResult.rows[0].tenant_id;

  // Update email_verified
  const result = await db.queryWithTenant(
    tenantId,
    `UPDATE users 
     SET email_verified = true, email_verified_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND email = $2
     RETURNING id, email, email_verified`,
    [userId, email]
  );

  if (result.rows.length === 0) {
    throw new Error('Email verification failed');
  }

  return {
    success: true,
    message: 'Email verified successfully',
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string) {
  const db = getDatabase();

  // Verify token
  const decoded = verifyToken(refreshToken);
  
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  // Check token in DB via SECURITY DEFINER (refresh_tokens has RLS; lookup by token has no tenant context yet)
  const tokenResult = await db.query(
    `SELECT * FROM get_refresh_token_info($1)`,
    [refreshToken]
  );

  if (tokenResult.rows.length === 0) {
    throw new Error('Refresh token not found or revoked');
  }

  const tokenData = tokenResult.rows[0];
  const tenantId = tokenData.tenant_id;

  // Check expiration
  if (new Date(tokenData.expires_at) < new Date()) {
    throw new Error('Refresh token expired');
  }

  // Get is_active via SECURITY DEFINER (tenant_id already from get_refresh_token_info)
  const userCheck = await db.query(
    'SELECT * FROM get_user_active_and_tenant($1)',
    [tokenData.user_id]
  );
  if (userCheck.rows.length === 0 || !userCheck.rows[0].is_active) {
    throw new Error('User account is inactive');
  }

  // Generate new access token
  const accessToken = generateAccessToken({
    userId: tokenData.user_id,
    tenantId,
    role: decoded.role,
    email: decoded.email,
  });

  return {
    access_token: accessToken,
    expires_in: 900, // 15 minutes in seconds
  };
}

/**
 * Logout user (revoke refresh token)
 */
export async function logoutUser(refreshToken: string) {
  const db = getDatabase();

  // Get token info (SECURITY DEFINER) to obtain tenant_id for RLS-scoped UPDATE
  const tokenResult = await db.query(
    'SELECT * FROM get_refresh_token_info($1)',
    [refreshToken]
  );
  if (tokenResult.rows.length === 0) {
    return { success: true };
  }
  const { tenant_id: tenantId } = tokenResult.rows[0];

  // Revoke refresh token (with tenant context so RLS allows the UPDATE)
  const result = await db.queryWithTenant(
    tenantId,
    `UPDATE refresh_tokens SET revoked = true WHERE token = $1 AND revoked = false RETURNING id`,
    [refreshToken]
  );

  return { success: true };
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string) {
  const db = getDatabase();

  // Find user via SECURITY DEFINER (bypasses RLS)
  const userResult = await db.query(
    'SELECT * FROM get_user_for_password_reset($1)',
    [email]
  );

  if (userResult.rows.length === 0) {
    // Don't reveal if email exists (security best practice)
    return { success: true, message: 'If email exists, password reset link has been sent' };
  }

  const user = userResult.rows[0];

  // Generate reset token
  const resetToken = generatePasswordResetToken(user.id, user.email);

  // Mock email sending (for MVP)
  console.log(`📧 [MOCK] Password reset email sent to ${user.email}`);
  console.log(`   Token: ${resetToken}`);
  console.log(`   Reset URL: http://localhost:3000/auth/reset-password?token=${resetToken}`);

  return { success: true, message: 'If email exists, password reset link has been sent' };
}

/**
 * Reset password
 */
export async function resetPassword(token: string, newPassword: string) {
  const db = getDatabase();

  // Validate password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message || 'Invalid password');
  }

  // Verify token
  const { userId, email } = verifyPasswordResetToken(token);

  // Get tenant_id via SECURITY DEFINER (bypasses RLS)
  const tenantResult = await db.query(
    'SELECT get_tenant_id_for_user($1) AS tenant_id',
    [userId]
  );

  if (tenantResult.rows.length === 0 || !tenantResult.rows[0].tenant_id) {
    throw new Error('User not found');
  }

  const tenantId = tenantResult.rows[0].tenant_id;

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  await db.queryWithTenant(
    tenantId,
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, userId]
  );

  // Revoke all refresh tokens for this user (force re-login); use tenant context for RLS
  await db.queryWithTenant(
    tenantId,
    `UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false`,
    [userId]
  );

  return { success: true, message: 'Password reset successfully' };
}
