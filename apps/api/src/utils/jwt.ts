import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

const MIN_SECRET_LENGTH = 32;

/**
 * Validate JWT_SECRET in production: must be set and at least 32 characters.
 * Call at app startup (e.g. index.ts) so the process fails fast.
 */
export function validateJwtSecret(): void {
  if (config.NODE_ENV !== 'production') return;
  const secret = config.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters in production. ` +
        'Set JWT_SECRET in your environment.'
    );
  }
}

const JWT_SECRET = config.JWT_SECRET;
const JWT_ACCESS_EXPIRES_IN = config.JWT_ACCESS_EXPIRES_IN;
const JWT_REFRESH_EXPIRES_IN = config.JWT_REFRESH_EXPIRES_IN;
const JWT_EMAIL_VERIFICATION_EXPIRES_IN = config.JWT_EMAIL_VERIFICATION_EXPIRES_IN;
const JWT_PASSWORD_RESET_EXPIRES_IN = config.JWT_PASSWORD_RESET_EXPIRES_IN;

export interface JWTPayload {
  userId: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'user';
  email: string;
  type?: 'access' | 'refresh' | 'email_verification' | 'password_reset';
}

/**
 * Generate access token (short-lived, 15 minutes)
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions
  );
}

/**
 * Generate refresh token (long-lived, 7 days).
 * Uses jti (JWT ID) so each token is unique and safe to store in refresh_tokens with UNIQUE(token).
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh', jti: crypto.randomUUID() },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
  );
}

/**
 * Generate email verification token (24 hours)
 */
export function generateEmailVerificationToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'email_verification' },
    JWT_SECRET,
    { expiresIn: JWT_EMAIL_VERIFICATION_EXPIRES_IN } as jwt.SignOptions
  );
}

/**
 * Generate password reset token (1 hour)
 */
export function generatePasswordResetToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'password_reset' },
    JWT_SECRET,
    { expiresIn: JWT_PASSWORD_RESET_EXPIRES_IN } as jwt.SignOptions
  );
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Verify email verification token
 */
export function verifyEmailVerificationToken(token: string): { userId: string; email: string } {
  const decoded = verifyToken(token);
  if (decoded.type !== 'email_verification') {
    throw new Error('Invalid token type');
  }
  return { userId: decoded.userId, email: decoded.email };
}

/**
 * Verify password reset token
 */
export function verifyPasswordResetToken(token: string): { userId: string; email: string } {
  const decoded = verifyToken(token);
  if (decoded.type !== 'password_reset') {
    throw new Error('Invalid token type');
  }
  return { userId: decoded.userId, email: decoded.email };
}
