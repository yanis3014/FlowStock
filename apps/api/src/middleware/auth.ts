import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import { getDatabase } from '../database/connection';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware to authenticate JWT token
 * Sets req.user and tenant context for RLS
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication token required' });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);
    
    if (decoded.type && decoded.type !== 'access') {
      res.status(401).json({ success: false, error: 'Invalid token type' });
      return;
    }

    // Verify user exists and is active (queryWithTenant sets context for this query)
    const db = getDatabase();
    const userResult = await db.queryWithTenant(
      decoded.tenantId,
      'SELECT id, tenant_id, email, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
      res.status(403).json({ success: false, error: 'Account is inactive' });
      return;
    }

    // Set user on request (subsequent handlers use req.user.tenantId with queryWithTenant)
    req.user = {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      email: user.email,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Token expired' || error.message === 'Invalid token') {
        res.status(401).json({ success: false, error: error.message });
        return;
      }
    }
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
}

/**
 * Middleware to authorize user roles
 * Usage: authorizeRole(['owner', 'admin'])
 */
export function authorizeRole(allowedRoles: Array<'owner' | 'admin' | 'user'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false, 
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
      return;
    }

    next();
  };
}
