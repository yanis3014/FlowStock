import { Request, Response, NextFunction } from 'express';
import { getCurrentSubscription } from '../services/subscription.service';
import type { SubscriptionTier } from '../services/subscription.service';
import { tierSatisfies } from '../services/subscription.service';

/**
 * Middleware: require subscription tier (e.g. premium or premium_plus).
 * Must be used after authenticateToken so req.user.tenantId is set.
 * Returns 403 with "Feature not available in current subscription tier" if tier insufficient.
 */
export function requireTier(allowedTiers: SubscriptionTier[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    try {
      const subscription = await getCurrentSubscription(req.user.tenantId);
      if (!subscription) {
        res.status(403).json({
          success: false,
          error: 'Feature not available in current subscription tier',
        });
        return;
      }

      if (!tierSatisfies(subscription.tier, allowedTiers)) {
        res.status(403).json({
          success: false,
          error: 'Feature not available in current subscription tier',
        });
        return;
      }

      next();
    } catch {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
}
