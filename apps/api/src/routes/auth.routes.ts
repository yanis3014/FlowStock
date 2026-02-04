import { Router, Request, Response } from 'express';
import {
  validateRegister,
  validateLogin,
  validateRefresh,
  validateForgotPassword,
  validateResetPassword,
  handleValidationErrors,
} from '../middleware/validation';
import {
  registerRateLimiter,
  loginRateLimiter,
  forgotPasswordRateLimiter,
  verifyEmailRateLimiter,
} from '../middleware/rateLimit';
import {
  registerUser,
  loginUser,
  verifyEmail,
  refreshAccessToken,
  logoutUser,
  requestPasswordReset,
  resetPassword,
} from '../services/auth.service';
import { authenticateToken } from '../middleware/auth';
import { sendAuthErrorResponse } from '../utils/authErrors';

const router = Router();

/**
 * GET /auth/me
 * Current user (protected by authenticateToken)
 */
router.get('/me', authenticateToken, (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  res.status(200).json({
    success: true,
    data: {
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      role: req.user.role,
      email: req.user.email,
    },
  });
});

/**
 * POST /auth/register
 * Register a new user and create tenant if needed
 */
router.post(
  '/register',
  registerRateLimiter,
  validateRegister,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const result = await registerUser({
        email: req.body.email,
        password: req.body.password,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        company_name: req.body.company_name,
        industry: req.body.industry,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      sendAuthErrorResponse(res, error, 'Registration failed');
    }
  }
);

/**
 * POST /auth/login
 * Authenticate user and get tokens
 */
router.post(
  '/login',
  loginRateLimiter,
  validateLogin,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const result = await loginUser({
        email: req.body.email,
        password: req.body.password,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      sendAuthErrorResponse(res, error, 'Login failed');
    }
  }
);

/**
 * GET /auth/verify-email
 * Verify email address with token
 */
router.get('/verify-email', verifyEmailRateLimiter, async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Verification token is required',
      });
      return;
    }

    const result = await verifyEmail(token);
    res.status(200).json(result);
  } catch (error) {
    sendAuthErrorResponse(res, error, 'Email verification failed');
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  validateRefresh,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const result = await refreshAccessToken(req.body.refresh_token);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      sendAuthErrorResponse(res, error, 'Token refresh failed');
    }
  }
);

/**
 * POST /auth/logout
 * Logout user and revoke refresh token
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body.refresh_token;
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
      return;
    }

    await logoutUser(refreshToken);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

/**
 * POST /auth/forgot-password
 * Request password reset email
 */
router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validateForgotPassword,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const result = await requestPasswordReset(req.body.email);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Password reset request failed',
      });
    }
  }
);

/**
 * POST /auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  validateResetPassword,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const result = await resetPassword(req.body.token, req.body.new_password);
      res.status(200).json(result);
    } catch (error) {
      sendAuthErrorResponse(res, error, 'Password reset failed');
    }
  }
);

export default router;
