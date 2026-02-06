import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { param, body, validationResult } from 'express-validator';
import {
  listPredefinedFormulas,
  getPredefinedFormulaById,
  executeFormula,
} from '../services/formula.service';
import type { FormulaExecuteParams } from '../services/formula.service';

const router = Router();

/**
 * GET /formulas/predefined
 * List all 8 predefined formulas
 */
router.get('/predefined', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  try {
    const formulas = await listPredefinedFormulas(req.user.tenantId);
    res.status(200).json({ success: true, data: formulas });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list formulas';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /formulas/predefined/:id
 * Get single predefined formula by id
 */
router.get(
  '/predefined/:id',
  authenticateToken,
  [param('id').isUUID().withMessage('Invalid formula id')],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Invalid formula id',
        errors: errors.array(),
      });
      return;
    }
    const formulaId = req.params.id as string;
    try {
      const formula = await getPredefinedFormulaById(req.user.tenantId, formulaId);
      if (!formula) {
        res.status(404).json({ success: false, error: 'Formula not found' });
        return;
      }
      res.status(200).json({ success: true, data: formula });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get formula';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * POST /formulas/:id/execute
 * Execute a formula with params
 */
router.post(
  '/:id/execute',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid formula id'),
    body('product_id').optional().isUUID(),
    body('period_days').optional().isInt({ min: 1, max: 365 }).toInt(),
    body('date_from').optional().isISO8601(),
    body('date_to').optional().isISO8601(),
    body('scope').optional().isIn(['product', 'all']),
  ],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Validation failed',
        errors: errors.array(),
      });
      return;
    }
    const formulaId = req.params.id as string;
    const params: FormulaExecuteParams = {
      product_id: req.body.product_id,
      period_days: req.body.period_days,
      date_from: req.body.date_from,
      date_to: req.body.date_to,
      scope: req.body.scope ?? 'all',
    };
    try {
      const result = await executeFormula(req.user.tenantId, formulaId, params);
      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      if (err.code === 'FORMULA_NOT_FOUND') {
        res.status(404).json({ success: false, error: 'Formula not found' });
        return;
      }
      if (err.code === 'PRODUCT_NOT_FOUND') {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }
      if (err.code === 'VALIDATION') {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute formula',
      });
    }
  }
);

export default router;
