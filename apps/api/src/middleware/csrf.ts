import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

const csrfOptions: csrf.CookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: config.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
};

export const csrfProtection = csrf({ cookie: csrfOptions });

export function csrfErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'EBADCSRFTOKEN') {
    res.status(403).json({ success: false, error: 'Invalid CSRF token' });
    return;
  }
  next(err);
}
