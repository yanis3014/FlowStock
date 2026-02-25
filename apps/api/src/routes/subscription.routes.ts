import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireTier } from '../middleware/subscriptionTier';
import { body, validationResult } from 'express-validator';
import {
  getCurrentSubscription,
  upgradeSubscription,
  getSubscriptionChanges,
  getFeaturesForTier,
  type SubscriptionTier,
} from '../services/subscription.service';

const router = Router();

const VALID_TIERS: SubscriptionTier[] = ['normal', 'premium', 'premium_plus'];

/**
 * GET /subscriptions/current
 * Current subscription for authenticated tenant
 */
router.get('/current', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const subscription = await getCurrentSubscription(req.user.tenantId);
    if (!subscription) {
      res.status(404).json({
        success: false,
        error: 'No subscription found for this tenant',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get subscription';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /subscriptions/upgrade
 * Upgrade or change subscription tier (body: { new_tier: 'premium' | 'premium_plus' })
 */
const validateUpgrade = [
  body('new_tier')
    .isIn(VALID_TIERS)
    .withMessage('new_tier must be one of: normal, premium, premium_plus'),
];

router.post(
  '/upgrade',
  authenticateToken,
  validateUpgrade,
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    if (!req.user?.tenantId || !req.user?.userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const newTier = req.body.new_tier as SubscriptionTier;

    try {
      const result = await upgradeSubscription(
        req.user.tenantId,
        newTier,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes('unchanged')) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      if (err.message?.includes('No subscription')) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Upgrade failed',
        ...(process.env.NODE_ENV === 'test' && err.message ? { detail: err.message } : {}),
      });
    }
  }
);

/**
 * GET /subscriptions/changes
 * History of subscription tier changes for the authenticated tenant (audit).
 */
router.get('/changes', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const changes = await getSubscriptionChanges(req.user.tenantId);
    res.status(200).json({
      success: true,
      data: changes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get subscription changes';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /subscriptions/premium-only
 * Example route protected by tier: requires premium or premium_plus (for testing middleware 403)
 */
router.get(
  '/premium-only',
  authenticateToken,
  requireTier(['premium', 'premium_plus']),
  (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { message: 'Premium feature accessible' } });
  }
);

export default router;
export { getFeaturesForTier };
