import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { query, param, validationResult } from 'express-validator';
import {
  getAllStockEstimates,
  getProductStockEstimate,
} from '../services/stock-estimate.service';

const router = Router();

/**
 * GET /stock-estimates
 * List stock time estimates for all active products of the tenant.
 * Query params: period_days (optional, default 30, min 7, max 365)
 */
router.get(
  '/',
  authenticateToken,
  [
    query('period_days')
      .optional()
      .isInt({ min: 7, max: 365 })
      .withMessage('period_days doit être un entier entre 7 et 365')
      .toInt(),
  ],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentification requise' });
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Paramètre invalide',
        errors: errors.array(),
      });
      return;
    }

    const periodDays = (req.query.period_days as unknown as number) ?? 30;

    try {
      const estimates = await getAllStockEstimates(req.user.tenantId, periodDays);
      res.status(200).json({ success: true, data: estimates });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de calculer les estimations';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * GET /stock-estimates/:productId
 * Get stock time estimate for a single product.
 * Query params: period_days (optional, default 30, min 7, max 365)
 */
router.get(
  '/:productId',
  authenticateToken,
  [
    param('productId').isUUID().withMessage('Identifiant de produit invalide'),
    query('period_days')
      .optional()
      .isInt({ min: 7, max: 365 })
      .withMessage('period_days doit être un entier entre 7 et 365')
      .toInt(),
  ],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentification requise' });
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Paramètre invalide',
        errors: errors.array(),
      });
      return;
    }

    const productId = req.params.productId as string;
    const periodDays = (req.query.period_days as unknown as number) ?? 30;

    try {
      const estimate = await getProductStockEstimate(req.user.tenantId, productId, periodDays);
      if (!estimate) {
        res.status(404).json({ success: false, error: 'Produit non trouvé' });
        return;
      }
      res.status(200).json({ success: true, data: estimate });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de calculer l\'estimation';
      res.status(500).json({ success: false, error: message });
    }
  }
);

export default router;
