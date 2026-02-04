import { Response } from 'express';

export interface AuthErrorResponse {
  statusCode: number;
  error: string;
  detail?: string;
}

/**
 * Centralized auth error handling: maps known auth/service errors to HTTP status and message.
 * Returns null if the error is not a known auth error (caller should use 500).
 */
export function getAuthErrorResponse(error: unknown): AuthErrorResponse | null {
  const err = error as Error & { code?: string };
  const message = err?.message ?? '';

  // 409 Conflict - duplicate (email already exists, etc.)
  if (
    message.includes('already exists') ||
    err?.code === '23505' ||
    message.toLowerCase().includes('duplicate') ||
    message.toLowerCase().includes('unique constraint')
  ) {
    return { statusCode: 409, error: message || 'Email already exists for this tenant' };
  }

  // 401 Unauthorized - invalid credentials, expired token, not found (before 400 so "Invalid credentials" → 401)
  if (
    message.includes('Invalid credentials') ||
    message.includes('expired') ||
    message.includes('Invalid token') ||
    message.includes('not found')
  ) {
    return { statusCode: 401, error: message };
  }

  // 400 Bad Request - validation / required / invalid input
  if (
    message.includes('required') ||
    message.includes('Invalid') ||
    message.includes('token is required')
  ) {
    return { statusCode: 400, error: message };
  }

  // 403 Forbidden - not verified, inactive
  if (message.includes('not verified') || message.includes('inactive')) {
    return { statusCode: 403, error: message };
  }

  return null;
}

/**
 * Send JSON error response for auth routes. Uses getAuthErrorResponse for known errors,
 * otherwise sends 500 with optional detail in test env.
 */
export function sendAuthErrorResponse(
  res: Response,
  error: unknown,
  defaultMessage: string,
  statusCode = 500
): void {
  const handled = getAuthErrorResponse(error);
  if (handled) {
    res.status(handled.statusCode).json({
      success: false,
      error: handled.error,
      ...(handled.detail && { detail: handled.detail }),
    });
    return;
  }
  const message = error instanceof Error ? error.message : undefined;
  res.status(statusCode).json({
    success: false,
    error: defaultMessage,
    ...(process.env.NODE_ENV === 'test' && message && { detail: message }),
  });
}
