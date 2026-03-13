/**
 * Losses Routes — Epic 8, Story 8.1
 * POST /losses — declare a stock loss
 * GET  /losses — list recent losses for the tenant
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { body, query, validationResult } from 'express-validator';
import { declareLoss, VALID_LOSS_REASONS } from '../services/loss.service';
import { getDatabase } from '../database/connection';
import type { LossDeclarationInput } from '@bmad/shared';

const router = Router();

/**
 * POST /losses
 * Body: { product_id, quantity, reason, notes? }
 */
router.post(
  '/',
  authenticateToken,
  [
    body('product_id').isUUID().withMessage('product_id must be a valid UUID'),
    body('quantity').isFloat({ gt: 0 }).withMessage('quantity must be > 0'),
    body('reason')
      .isIn(VALID_LOSS_REASONS)
      .withMessage(`reason must be one of: ${VALID_LOSS_REASONS.join(', ')}`),
    body('notes').optional({ nullable: true }).isString().isLength({ max: 500 }),
  ],
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

    const input: LossDeclarationInput = {
      product_id: req.body.product_id as string,
      quantity: parseFloat(req.body.quantity as string),
      reason: req.body.reason as LossDeclarationInput['reason'],
      notes: (req.body.notes as string | undefined) ?? null,
    };

    try {
      const declaration = await declareLoss(tenantId, input, req.user?.userId);
      res.status(201).json({ success: true, data: declaration });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la déclaration de perte.';
      res.status(400).json({ success: false, error: message });
    }
  }
);

/**
 * GET /losses
 * Returns recent loss movements for the tenant (last 90 days, max 200 rows).
 * Query params: product_id?, date_from?, date_to?, limit?, page?
 */
router.get(
  '/',
  authenticateToken,
  [
    query('product_id').optional().isUUID(),
    query('date_from').optional().isISO8601(),
    query('date_to').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('page').optional().isInt({ min: 1 }),
  ],
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

    const limit = Math.min(200, parseInt(req.query.limit as string, 10) || 50);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const offset = (page - 1) * limit;

    const conditions: string[] = [
      `m.tenant_id = $1`,
      `m.movement_type = 'loss'`,
      `m.created_at >= NOW() - INTERVAL '90 days'`,
    ];
    const values: (string | number)[] = [tenantId];
    let idx = 2;

    if (req.query.product_id) {
      conditions.push(`m.product_id = $${idx}`);
      values.push(req.query.product_id as string);
      idx++;
    }
    if (req.query.date_from) {
      conditions.push(`m.created_at >= $${idx}`);
      values.push(req.query.date_from as string);
      idx++;
    }
    if (req.query.date_to) {
      conditions.push(`m.created_at <= $${idx}`);
      values.push(req.query.date_to as string);
      idx++;
    }

    const where = conditions.join(' AND ');
    const db = getDatabase();

    const countResult = await db.queryWithTenant<{ count: string }>(
      tenantId,
      `SELECT COUNT(*)::text AS count FROM stock_movements m WHERE ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const listResult = await db.queryWithTenant<{
      id: string;
      product_id: string;
      product_name: string;
      product_sku: string;
      quantity_before: string | null;
      quantity_after: string | null;
      reason: string | null;
      user_email: string | null;
      created_at: Date;
    }>(
      tenantId,
      `SELECT m.id, m.product_id, p.name AS product_name, p.sku AS product_sku,
              m.quantity_before::text, m.quantity_after::text,
              m.reason, u.email AS user_email, m.created_at
       FROM stock_movements m
       JOIN products p ON m.product_id = p.id AND p.tenant_id = m.tenant_id
       LEFT JOIN users u ON m.user_id = u.id AND u.tenant_id = m.tenant_id
       WHERE ${where}
       ORDER BY m.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    const data = listResult.rows.map((row) => ({
      id: row.id,
      product_id: row.product_id,
      product_name: row.product_name,
      product_sku: row.product_sku,
      quantity_before: row.quantity_before != null ? parseFloat(row.quantity_before) : null,
      quantity_after: row.quantity_after != null ? parseFloat(row.quantity_after) : null,
      quantity_lost:
        row.quantity_before != null && row.quantity_after != null
          ? parseFloat(row.quantity_before) - parseFloat(row.quantity_after)
          : null,
      reason: row.reason,
      user_email: row.user_email ?? null,
      created_at: row.created_at.toISOString(),
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
    });
  }
);

export default router;
