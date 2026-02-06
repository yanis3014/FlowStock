import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { param, body, validationResult } from 'express-validator';
import {
  listPredefinedFormulas,
  getPredefinedFormulaById,
  executeFormula,
  createCustomFormula,
  listCustomFormulas,
  getCustomFormulaById,
  updateCustomFormula,
  deleteCustomFormula,
  previewFormula,
} from '../services/formula.service';
import type { FormulaExecuteParams } from '../services/formula.service';
import {
  validateFormulaSyntax,
  getAvailableVariables,
  getAvailableFunctions,
} from '../services/custom-formula-engine';

const router = Router();

// ============================================================================
// Predefined formulas (Story 3.3)
// ============================================================================

/**
 * GET /formulas/predefined
 * List all 8 predefined formulas
 */
router.get('/predefined', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentification requise' });
    return;
  }
  try {
    const formulas = await listPredefinedFormulas(req.user.tenantId);
    res.status(200).json({ success: true, data: formulas });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de lister les formules';
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
  [param('id').isUUID().withMessage('Identifiant de formule invalide')],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentification requise' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Identifiant de formule invalide',
        errors: errors.array(),
      });
      return;
    }
    const formulaId = req.params.id as string;
    try {
      const formula = await getPredefinedFormulaById(req.user.tenantId, formulaId);
      if (!formula) {
        res.status(404).json({ success: false, error: 'Formule non trouvée' });
        return;
      }
      res.status(200).json({ success: true, data: formula });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de récupérer la formule';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// ============================================================================
// Custom formulas — CRUD + validate + preview (Story 3.4)
// ============================================================================

/**
 * GET /formulas/custom/variables
 * List all available variables and functions for autocomplete
 */
router.get('/custom/variables', authenticateToken, (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      variables: getAvailableVariables(),
      functions: getAvailableFunctions(),
    },
  });
});

/**
 * POST /formulas/custom/validate
 * Validate formula syntax without saving
 */
router.post(
  '/custom/validate',
  authenticateToken,
  [body('expression').isString().isLength({ min: 1, max: 2000 }).withMessage('Expression requise (1-2000 caractères)')],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentification requise' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Échec de la validation',
        errors: errors.array(),
      });
      return;
    }
    try {
      const result = validateFormulaSyntax(req.body.expression);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Échec de la validation',
      });
    }
  }
);

/**
 * POST /formulas/custom/preview
 * Preview formula result without saving
 */
router.post(
  '/custom/preview',
  authenticateToken,
  [
    body('expression').isString().isLength({ min: 1, max: 2000 }).withMessage('Expression requise (1-2000 caractères)'),
    body('product_id').optional().isUUID(),
    body('period_days').optional().isInt({ min: 1, max: 365 }).toInt(),
    body('scope').optional().isIn(['product', 'all']),
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
        error: errors.array()[0]?.msg ?? 'Échec de la validation',
        errors: errors.array(),
      });
      return;
    }
    const params: FormulaExecuteParams = {
      product_id: req.body.product_id,
      period_days: req.body.period_days,
      scope: req.body.scope ?? 'all',
    };
    try {
      const result = await previewFormula(req.user.tenantId, req.body.expression, params);
      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      if (err.code === 'VALIDATION') {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      if (err.code === 'PRODUCT_NOT_FOUND') {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Échec de la prévisualisation',
      });
    }
  }
);

/**
 * POST /formulas/custom
 * Create a new custom formula
 */
router.post(
  '/custom',
  authenticateToken,
  [
    body('name').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Nom requis (1-255 caractères)'),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('formula_expression').isString().isLength({ min: 1, max: 2000 }).withMessage('Expression requise (1-2000 caractères)'),
  ],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId || !req.user?.userId) {
      res.status(401).json({ success: false, error: 'Authentification requise' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Échec de la validation',
        errors: errors.array(),
      });
      return;
    }
    try {
      const formula = await createCustomFormula(req.user.tenantId, req.user.userId, {
        name: req.body.name,
        description: req.body.description,
        formula_expression: req.body.formula_expression,
      });
      res.status(201).json({ success: true, data: formula });
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      if (err.code === 'VALIDATION') {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      // Unique constraint violation
      if ((err as Error & { constraint?: string }).constraint === 'unique_formula_name_per_tenant') {
        res.status(409).json({ success: false, error: 'Une formule avec ce nom existe déjà' });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Impossible de créer la formule',
      });
    }
  }
);

/**
 * GET /formulas/custom
 * List all custom formulas for the tenant
 */
router.get('/custom', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentification requise' });
    return;
  }
  try {
    const formulas = await listCustomFormulas(req.user.tenantId);
    res.status(200).json({ success: true, data: formulas });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de lister les formules personnalisées';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /formulas/custom/:id
 * Get a single custom formula
 */
router.get(
  '/custom/:id',
  authenticateToken,
  [param('id').isUUID().withMessage('Identifiant de formule invalide')],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentification requise' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Identifiant de formule invalide',
        errors: errors.array(),
      });
      return;
    }
    try {
      const formula = await getCustomFormulaById(req.user.tenantId, req.params.id as string);
      if (!formula) {
        res.status(404).json({ success: false, error: 'Formule non trouvée' });
        return;
      }
      res.status(200).json({ success: true, data: formula });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Impossible de récupérer la formule',
      });
    }
  }
);

/**
 * PUT /formulas/custom/:id
 * Update a custom formula
 */
router.put(
  '/custom/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Identifiant de formule invalide'),
    body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('formula_expression').optional().isString().isLength({ min: 1, max: 2000 }),
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
        error: errors.array()[0]?.msg ?? 'Échec de la validation',
        errors: errors.array(),
      });
      return;
    }
    try {
      const formula = await updateCustomFormula(req.user.tenantId, req.params.id as string, {
        name: req.body.name,
        description: req.body.description,
        formula_expression: req.body.formula_expression,
      });
      if (!formula) {
        res.status(404).json({ success: false, error: 'Formule non trouvée' });
        return;
      }
      res.status(200).json({ success: true, data: formula });
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      if (err.code === 'VALIDATION') {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Impossible de modifier la formule',
      });
    }
  }
);

/**
 * DELETE /formulas/custom/:id
 * Soft-delete a custom formula
 */
router.delete(
  '/custom/:id',
  authenticateToken,
  [param('id').isUUID().withMessage('Identifiant de formule invalide')],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentification requise' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Identifiant de formule invalide',
        errors: errors.array(),
      });
      return;
    }
    try {
      const deleted = await deleteCustomFormula(req.user.tenantId, req.params.id as string);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Formule non trouvée' });
        return;
      }
      res.status(200).json({ success: true, message: 'Formule supprimée' });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Impossible de supprimer la formule',
      });
    }
  }
);

// ============================================================================
// Execute formula (predefined or custom)
// ============================================================================

/**
 * POST /formulas/:id/execute
 * Execute a formula with params (works for both predefined and custom)
 */
router.post(
  '/:id/execute',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Identifiant de formule invalide'),
    body('product_id').optional().isUUID(),
    body('period_days').optional().isInt({ min: 1, max: 365 }).toInt(),
    body('date_from').optional().isISO8601(),
    body('date_to').optional().isISO8601(),
    body('scope').optional().isIn(['product', 'all']),
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
        error: errors.array()[0]?.msg ?? 'Échec de la validation',
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
        res.status(404).json({ success: false, error: 'Formule non trouvée' });
        return;
      }
      if (err.code === 'PRODUCT_NOT_FOUND') {
        res.status(404).json({ success: false, error: 'Produit non trouvé' });
        return;
      }
      if (err.code === 'VALIDATION') {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Impossible d\'exécuter la formule',
      });
    }
  }
);

export default router;
