import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import {
  listRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  type RecipeListFilters,
} from '../services/recipe.service';
import type { RecipeCreateInput, RecipeUpdateInput } from '@bmad/shared';

const router = Router();

/**
 * GET /recipes
 * List recipes for the authenticated tenant
 */
router.get(
  '/',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Paramètres invalides', details: errors.array() });
      return;
    }

    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const filters: RecipeListFilters = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      search: req.query.search as string | undefined,
    };

    try {
      const result = await listRecipes(req.user.tenantId, filters);
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (err) {
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erreur interne' });
    }
  }
);

/**
 * GET /recipes/:id
 * Get a single recipe by id
 */
router.get(
  '/:id',
  authenticateToken,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'ID invalide' });
      return;
    }

    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    try {
      const recipe = await getRecipeById(req.params.id, req.user.tenantId);
      if (!recipe) {
        res.status(404).json({ success: false, error: 'Fiche technique non trouvée' });
        return;
      }
      res.json({ success: true, data: recipe });
    } catch (err) {
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erreur interne' });
    }
  }
);

/**
 * POST /recipes
 * Create a new recipe (fiche technique)
 */
router.post(
  '/',
  authenticateToken,
  [
    body('name').isString().trim().notEmpty().withMessage('Le nom est obligatoire'),
    body('category').optional().isString().trim(),
    body('source').optional().isIn(['manual', 'scan_ia']),
    body('confidence').optional().isIn(['high', 'medium', 'low']),
    body('ai_note').optional().isString().trim(),
    body('ingredients').isArray().withMessage('Les ingrédients doivent être un tableau'),
    body('ingredients.*.ingredient_name').isString().trim().notEmpty(),
    body('ingredients.*.quantity').isFloat({ min: 0.001 }),
    body('ingredients.*.unit').isString().trim().notEmpty(),
    body('ingredients.*.product_id').optional({ nullable: true }).isUUID(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Données invalides', details: errors.array() });
      return;
    }

    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const input = req.body as RecipeCreateInput;

    try {
      const recipe = await createRecipe(req.user.tenantId, input);
      res.status(201).json({ success: true, data: recipe });
    } catch (err) {
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erreur interne' });
    }
  }
);

/**
 * PUT /recipes/:id
 * Update a recipe (fiche technique)
 */
router.put(
  '/:id',
  authenticateToken,
  [
    param('id').isUUID(),
    body('name').optional().isString().trim().notEmpty(),
    body('category').optional().isString().trim(),
    body('ai_note').optional().isString().trim(),
    body('ingredients').optional().isArray(),
    body('ingredients.*.ingredient_name').optional().isString().trim().notEmpty(),
    body('ingredients.*.quantity').optional().isFloat({ min: 0.001 }),
    body('ingredients.*.unit').optional().isString().trim().notEmpty(),
    body('ingredients.*.product_id').optional({ nullable: true }).isUUID(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Données invalides', details: errors.array() });
      return;
    }

    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const input = req.body as RecipeUpdateInput;

    try {
      const recipe = await updateRecipe(req.params.id, req.user.tenantId, input);
      if (!recipe) {
        res.status(404).json({ success: false, error: 'Fiche technique non trouvée' });
        return;
      }
      res.json({ success: true, data: recipe });
    } catch (err) {
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erreur interne' });
    }
  }
);

/**
 * DELETE /recipes/:id
 * Soft delete a recipe
 */
router.delete(
  '/:id',
  authenticateToken,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'ID invalide' });
      return;
    }

    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    try {
      const deleted = await deleteRecipe(req.params.id, req.user.tenantId);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Fiche technique non trouvée' });
        return;
      }
      res.json({ success: true, message: 'Fiche technique supprimée' });
    } catch (err) {
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erreur interne' });
    }
  }
);

export default router;
