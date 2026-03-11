import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../database/connection';
import { verifyToken } from '../utils/jwt';

export async function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;
    const cookieToken =
      typeof req.cookies?.token === 'string' ? req.cookies.token : null;
    const token = bearerToken || cookieToken;

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Non authentifié',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const decoded = verifyToken(token);
    if (decoded.type && decoded.type !== 'access') {
      res.status(401).json({
        success: false,
        error: 'Token invalide',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    const db = getDatabase();
    const userResult = await db.query<{
      id: string;
      tenant_id: string;
      email: string;
      role: 'owner' | 'admin' | 'user';
      is_active: boolean;
    }>(
      `SELECT id, tenant_id, email, role, is_active
       FROM users
       WHERE id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: 'Non authentifié',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
      res.status(403).json({
        success: false,
        error: 'Compte inactif',
        code: 'ACCOUNT_INACTIVE',
      });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Accès réservé aux administrateurs',
        code: 'FORBIDDEN',
      });
      return;
    }

    req.user = {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      email: user.email,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'Non authentifié',
      code: 'UNAUTHORIZED',
    });
  }
}
