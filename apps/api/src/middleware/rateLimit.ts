import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

/** No-op middleware for test env so E2E/integration tests never hit 429 */
const noopRateLimit = (_req: Request, _res: Response, next: NextFunction) => next();

/**
 * Rate limiter for registration endpoint
 * 5 attempts per hour per IP; disabled in test to avoid 429 in E2E/integration.
 */
export const registerRateLimiter = isTest
  ? noopRateLimit
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5,
      message: {
        success: false,
        error: 'Too many registration attempts. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

/**
 * Rate limiter for login endpoint
 * 10 attempts per hour per IP; disabled in test.
 */
export const loginRateLimiter = isTest
  ? noopRateLimit
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 10,
      message: {
        success: false,
        error: 'Too many login attempts. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

/**
 * Rate limiter for forgot password endpoint
 * 3 per hour; disabled in test.
 */
export const forgotPasswordRateLimiter = isTest
  ? noopRateLimit
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 3,
      message: {
        success: false,
        error: 'Too many password reset requests. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

/**
 * Rate limiter for verify-email endpoint (prevent token enumeration)
 * 20 per hour; disabled in test.
 */
export const verifyEmailRateLimiter = isTest
  ? noopRateLimit
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 20,
      message: {
        success: false,
        error: 'Too many verification attempts. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

/**
 * Rate limiter for reset-password endpoint (limit brute-force on token)
 * 10 per hour; disabled in test.
 */
export const resetPasswordRateLimiter = isTest
  ? noopRateLimit
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 10,
      message: {
        success: false,
        error: 'Too many password reset attempts. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
