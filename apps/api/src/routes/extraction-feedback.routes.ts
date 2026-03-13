import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import {
  createExtractionFeedback,
  getRecentFeedbacks,
} from '../services/extraction-feedback.service';
import type { ExtractionFeedbackCreateInput } from '@bmad/shared';

const router = Router();

/**
 * GET /extraction-feedback
 * Get recent feedback entries for few-shot injection (last N by default 3)
 */
router.get(
  '/',
  authenticateToken,
  [query('limit').optional().isInt({ min: 1, max: 10 })],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Paramètres invalides' });
      return;
    }

    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 3;

    try {
      const feedbacks = await getRecentFeedbacks(req.user.tenantId, limit);
      res.json({ success: true, data: feedbacks });
    } catch (err) {
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erreur interne' });
    }
  }
);

/**
 * POST /extraction-feedback
 * Record a human correction of an AI extraction (few-shot learning)
 */
router.post(
  '/',
  authenticateToken,
  [
    body('plat_nom').isString().trim().notEmpty().withMessage('Le nom du plat est obligatoire'),
    body('extraction_ia').isObject().withMessage('extraction_ia doit être un objet JSON'),
    body('extraction_ia.nom').isString().notEmpty(),
    body('extraction_ia.ingredients').isArray(),
    body('correction_humaine').isObject().withMessage('correction_humaine doit être un objet JSON'),
    body('correction_humaine.nom').isString().notEmpty(),
    body('correction_humaine.ingredients').isArray(),
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

    const input = req.body as ExtractionFeedbackCreateInput;

    try {
      const feedback = await createExtractionFeedback(req.user.tenantId, input);
      res.status(201).json({ success: true, data: feedback });
    } catch (err) {
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erreur interne' });
    }
  }
);

export default router;
