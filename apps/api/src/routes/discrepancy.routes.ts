/**
 * Discrepancy Routes — Epic 8, Story 8.2
 * GET /discrepancies          — liste des écarts par produit
 * GET /discrepancies/analyze  — même chose + analyse GPT-4o
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { query, validationResult } from 'express-validator';
import { getDiscrepancies } from '../services/discrepancy.service';

const router = Router();

const commonValidators = [
  query('period_days').optional().isInt({ min: 1, max: 365 }),
  query('anomaly_threshold_pct').optional().isFloat({ min: 1, max: 100 }),
];

/**
 * GET /discrepancies
 * Returns stock discrepancy report (no AI) for the tenant.
 */
router.get(
  '/',
  authenticateToken,
  commonValidators,
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const report = await getDiscrepancies(tenantId, {
        period_days: req.query.period_days ? parseInt(req.query.period_days as string, 10) : undefined,
        anomaly_threshold_pct: req.query.anomaly_threshold_pct
          ? parseFloat(req.query.anomaly_threshold_pct as string)
          : undefined,
        with_ai: false,
      });

      res.json({ success: true, data: report });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du calcul des écarts.';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * GET /discrepancies/analyze
 * Returns stock discrepancy report WITH GPT-4o analysis for anomalous products.
 */
router.get(
  '/analyze',
  authenticateToken,
  commonValidators,
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const report = await getDiscrepancies(tenantId, {
        period_days: req.query.period_days ? parseInt(req.query.period_days as string, 10) : undefined,
        anomaly_threshold_pct: req.query.anomaly_threshold_pct
          ? parseFloat(req.query.anomaly_threshold_pct as string)
          : undefined,
        with_ai: true,
      });

      res.json({ success: true, data: report });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'analyse IA.';
      res.status(500).json({ success: false, error: message });
    }
  }
);

export default router;
