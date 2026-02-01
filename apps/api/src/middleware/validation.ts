import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

/**
 * Validation middleware for registration
 */
export const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Valid email address required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one digit'),
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  body('company_name')
    .notEmpty()
    .withMessage('Company name is required for registration')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Company name must be between 1 and 255 characters'),
  body('industry')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Industry must be less than 100 characters'),
];

/**
 * Validation middleware for login
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Valid email address required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Validation middleware for refresh token
 */
export const validateRefresh = [
  body('refresh_token')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

/**
 * Validation middleware for forgot password
 */
export const validateForgotPassword = [
  body('email')
    .isEmail()
    .withMessage('Valid email address required')
    .normalizeEmail(),
];

/**
 * Validation middleware for reset password
 */
export const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one digit'),
];

/**
 * Middleware to check validation results
 */
export function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
    return;
  }
  next();
}
