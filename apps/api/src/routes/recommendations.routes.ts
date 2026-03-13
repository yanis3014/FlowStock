import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { param, body, validationResult } from 'express-validator';
import {
  generateOrderRecommendations,
  getLatestRecommendation,
  getRecommendationHistory,
  validateRecommendation,
  getAiSettings,
  updateAiSettings,
} from '../services/order-recommendation.service';

const router = Router();

/**
 * GET /recommendations
 * Get the latest pending recommendation for the tenant.
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentification requise' });
    return;
  }
  try {
    const recommendation = await getLatestRecommendation(req.user.tenantId);
    res.json({ success: true, data: recommendation });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /recommendations/history
 * Get recommendation history for the tenant.
 */
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentification requise' });
    return;
  }
  try {
    const history = await getRecommendationHistory(req.user.tenantId);
    res.json({ success: true, data: history });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /recommendations/generate
 * Generate new order recommendations for the tenant.
 */
router.post('/generate', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentification requise' });
    return;
  }
  try {
    const recommendation = await generateOrderRecommendations(req.user.tenantId);
    res.status(201).json({ success: true, data: recommendation });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /recommendations/:id/validate
 * Validate an order recommendation (1-click).
 * Optional body: { items: RecommendationItem[] } for adjusted quantities.
 */
router.post(
  '/:id/validate',
  authenticateToken,
  [param('id').isUUID().withMessage('ID de recommandation invalide')],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId || !req.user?.userId) {
      res.status(401).json({ success: false, error: 'Authentification requise' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg });
      return;
    }
    try {
      const result = await validateRecommendation(
        req.user.tenantId,
        req.params.id,
        req.user.userId,
        req.body.items
      );
      res.json({ success: true, data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur serveur';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * POST /recommendations/:id/reject
 * Reject a recommendation.
 */
router.post(
  '/:id/reject',
  authenticateToken,
  [param('id').isUUID().withMessage('ID de recommandation invalide')],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentification requise' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg });
      return;
    }
    try {
      const { getDatabase } = await import('../database/connection');
      const db = getDatabase();
      await db.queryWithTenant(
        req.user.tenantId,
        `UPDATE order_recommendations SET status = 'rejected', validated_at = NOW() WHERE id = $1 AND status = 'pending'`,
        [req.params.id]
      );
      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur serveur';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * GET /recommendations/settings
 * Get AI autonomy settings for the tenant.
 */
router.get('/settings', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentification requise' });
    return;
  }
  try {
    const settings = await getAiSettings(req.user.tenantId);
    res.json({ success: true, data: settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PUT /recommendations/settings
 * Update AI autonomy settings for the tenant.
 */
router.put(
  '/settings',
  authenticateToken,
  [
    body('ai_autonomy_level')
      .isInt({ min: 1, max: 3 })
      .withMessage('Le niveau d\'autonomie doit être entre 1 et 3'),
    body('ai_auto_order_threshold')
      .isFloat({ min: 0 })
      .withMessage('Le seuil de commande automatique doit être positif'),
  ],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentification requise' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg });
      return;
    }
    try {
      await updateAiSettings(
        req.user.tenantId,
        req.body.ai_autonomy_level,
        req.body.ai_auto_order_threshold
      );
      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur serveur';
      res.status(500).json({ success: false, error: message });
    }
  }
);

export default router;
