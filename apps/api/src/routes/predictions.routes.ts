import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { param, query, validationResult } from 'express-validator';
import {
  getAllPredictions,
  computeProductAnalytics,
  getAllProductAnalytics,
  computeStockPredictionFallback,
  getAccuracyReport,
  evaluatePredictionAccuracy,
} from '../services/prediction.service';
import { computeDailySnapshots, getProductSnapshots } from '../services/daily-snapshot.service';
import { getDatabase } from '../database/connection';

const router = Router();

/**
 * GET /predictions
 * List all stock predictions for the tenant (sorted by urgency).
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentification requise' });
    return;
  }
  try {
    const predictions = await getAllPredictions(req.user.tenantId);
    res.json({ success: true, data: predictions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /predictions/compute
 * Trigger prediction computation for all active products of the tenant.
 */
router.post('/compute', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentification requise' });
    return;
  }
  try {
    const tenantId = req.user.tenantId;
    const db = getDatabase();

    // Fetch all active products with their analytics
    const productsResult = await db.queryWithTenant<{
      id: string;
      name: string;
      quantity: string;
      unit: string;
    }>(
      tenantId,
      `SELECT id, name, quantity, unit FROM products WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    const analyticsResult = await db.queryWithTenant<{
      product_id: string;
      avg_7d: string | null;
    }>(
      tenantId,
      `SELECT product_id, avg_7d FROM product_analytics WHERE tenant_id = $1`,
      [tenantId]
    );
    const analyticsMap = new Map(analyticsResult.rows.map((r) => [r.product_id, r]));

    let computed = 0;
    for (const product of productsResult.rows) {
      const analytics = analyticsMap.get(product.id);
      const avg7d = analytics?.avg_7d ? parseFloat(analytics.avg_7d) : null;
      await computeStockPredictionFallback(
        tenantId,
        product.id,
        parseFloat(product.quantity),
        avg7d
      );
      computed++;
    }

    res.json({ success: true, computed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /predictions/analytics
 * Get product analytics (rolling averages, seasonality, trends).
 */
router.get('/analytics', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentification requise' });
    return;
  }
  try {
    const analytics = await getAllProductAnalytics(req.user.tenantId);
    res.json({ success: true, data: analytics });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /predictions/analytics/compute
 * Recompute analytics for all products of the tenant.
 */
router.post('/analytics/compute', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentification requise' });
    return;
  }
  try {
    const tenantId = req.user.tenantId;
    const db = getDatabase();

    const productsResult = await db.queryWithTenant<{ id: string }>(
      tenantId,
      `SELECT id FROM products WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    let computed = 0;
    for (const product of productsResult.rows) {
      const result = await computeProductAnalytics(tenantId, product.id);
      if (result) computed++;
    }

    res.json({ success: true, computed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /predictions/accuracy
 * Get prediction accuracy report for the tenant.
 */
router.get(
  '/accuracy',
  authenticateToken,
  [query('days').optional().isInt({ min: 7, max: 365 }).toInt()],
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
      const days = (req.query.days as unknown as number) ?? 30;
      const report = await getAccuracyReport(req.user.tenantId, days);
      res.json({ success: true, data: report });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur serveur';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * POST /predictions/snapshots/compute
 * Trigger daily snapshot computation for the current tenant.
 */
router.post('/snapshots/compute', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentification requise' });
    return;
  }
  try {
    const date = typeof req.body.date === 'string' ? req.body.date : undefined;
    const count = await computeDailySnapshots(req.user.tenantId, date);
    res.json({ success: true, snapshots_computed: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /predictions/snapshots/:productId
 * Get daily snapshots for a product.
 */
router.get(
  '/snapshots/:productId',
  authenticateToken,
  [
    param('productId').isUUID().withMessage('ID produit invalide'),
    query('days').optional().isInt({ min: 7, max: 365 }).toInt(),
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
      const days = (req.query.days as unknown as number) ?? 30;
      const snapshots = await getProductSnapshots(req.user.tenantId, req.params.productId, days);
      res.json({ success: true, data: snapshots });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur serveur';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * POST /predictions/accuracy/evaluate
 * Evaluate prediction accuracy for yesterday (or specified date).
 */
router.post('/accuracy/evaluate', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentification requise' });
    return;
  }
  try {
    const date = typeof req.body.date === 'string' ? req.body.date : undefined;
    const count = await evaluatePredictionAccuracy(req.user.tenantId, date);
    res.json({ success: true, evaluations_computed: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
