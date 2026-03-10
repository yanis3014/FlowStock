/**
 * POS Product Mapping API (Story 2.3)
 * CRUD for mapping POS product identifiers to Flowstock products.
 * Used by Lightspeed (and future L'Addition, Square) adapters.
 */
import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import {
  listMappings,
  createMapping,
  deleteMappingById,
  type PosProductMappingCreate,
} from '../services/pos-product-mapping.service';
import type { PosType } from '../services/pos-webhook.service';

const router = Router();
const POS_TYPES: PosType[] = ['lightspeed', 'laddition', 'square', 'manual'];

router.use(authenticateToken);

/**
 * GET /pos-mapping?pos_type=lightspeed
 * List mappings for the tenant, optionally filtered by pos_type.
 */
router.get(
  '/',
  query('pos_type').optional().isIn(POS_TYPES).withMessage('pos_type must be one of: ' + POS_TYPES.join(', ')),
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg ?? 'Validation failed' });
      return;
    }
    const posType = typeof req.query.pos_type === 'string' ? req.query.pos_type : undefined;
    const mappings = await listMappings(req.user.tenantId, posType);
    res.status(200).json({ success: true, data: mappings });
  }
);

/**
 * POST /pos-mapping
 * Create a mapping. Body: pos_type, pos_identifier, flowstock_product_id (optional), flowstock_sku (optional).
 * At least one of flowstock_product_id or flowstock_sku required.
 */
router.post(
  '/',
  body('pos_type').isIn(POS_TYPES).withMessage('pos_type required and must be one of: ' + POS_TYPES.join(', ')),
  body('pos_identifier').isString().trim().notEmpty().withMessage('pos_identifier is required'),
  body('flowstock_product_id').optional({ values: 'null' }).isUUID().withMessage('flowstock_product_id must be a valid UUID'),
  body('flowstock_sku').optional({ values: 'null' }).isString().trim(),
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg ?? 'Validation failed' });
      return;
    }
    const input: PosProductMappingCreate = {
      pos_type: req.body.pos_type,
      pos_identifier: req.body.pos_identifier,
      flowstock_product_id: req.body.flowstock_product_id ?? null,
      flowstock_sku: req.body.flowstock_sku ?? null,
    };
    try {
      const mapping = await createMapping(req.user.tenantId, input);
      res.status(201).json({ success: true, data: mapping });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Create failed';
      const pgCode = e && typeof (e as { code?: string }).code === 'string' ? (e as { code?: string }).code : '';
      if (pgCode === '23505' || message.toLowerCase().includes('duplicate')) {
        res.status(409).json({ success: false, error: 'A mapping for this pos_type and pos_identifier already exists' });
        return;
      }
      if (message.includes('required') || message.includes('Either') || message.includes('Product not found')) {
        res.status(400).json({ success: false, error: message });
        return;
      }
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /pos-mapping/:id
 * Delete a mapping by id.
 */
router.delete(
  '/:id',
  param('id').isUUID().withMessage('id must be a valid UUID'),
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg ?? 'Validation failed' });
      return;
    }
    const deleted = await deleteMappingById(req.user.tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Mapping not found' });
      return;
    }
    res.status(204).send();
  }
);

export default router;
