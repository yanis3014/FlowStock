import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

/**
 * Rate limiter for registration endpoint
 * 5 attempts per hour per IP (higher in test to avoid 429 in integration tests)
 */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTest ? 200 : 5,
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for login endpoint
 * 10 attempts per hour per IP (higher in test)
 */
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTest ? 200 : 10,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for forgot password endpoint
 * 3 attempts per hour per IP (higher in test)
 */
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTest ? 200 : 3,
  message: {
    success: false,
    error: 'Too many password reset requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for verify-email endpoint (prevent token enumeration)
 * 20 attempts per hour per IP (higher in test)
 */
export const verifyEmailRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTest ? 200 : 20,
  message: {
    success: false,
    error: 'Too many verification attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
