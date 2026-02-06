import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { body, query, param, validationResult } from 'express-validator';
import {
  listSales,
  getSaleById,
  createSale,
  updateSale,
  deleteSale,
  getSalesSummary,
  getSalesStats,
} from '../services/sales.service';
import type { SaleCreateInput, SaleUpdateInput, SaleListFilters, SaleSummaryFilters } from '@bmad/shared';

const router = Router();

/**
 * GET /sales/stats
 * Quick stats (today, yesterday, this week, this month)
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  try {
    const stats = await getSalesStats(req.user.tenantId);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get sales stats';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /sales/summary
 * Aggregations by day, product, or location
 */
router.get(
  '/summary',
  authenticateToken,
  [
    query('date_from').optional().isISO8601().withMessage('Invalid date_from'),
    query('date_to').optional().isISO8601().withMessage('Invalid date_to'),
    query('product_id').optional().isUUID(),
    query('location_id').optional().isUUID(),
    query('group_by').optional().isIn(['day', 'product', 'location']),
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
    const filters: SaleSummaryFilters = {
      date_from: req.query.date_from as string | undefined,
      date_to: req.query.date_to as string | undefined,
      product_id: req.query.product_id as string | undefined,
      location_id: req.query.location_id as string | undefined,
      group_by: req.query.group_by as 'day' | 'product' | 'location' | undefined,
    };
    try {
      const result = await getSalesSummary(req.user.tenantId, filters);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get sales summary';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * GET /sales
 * List sales with pagination and filters
 */
router.get(
  '/',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('product_id').optional().isUUID(),
    query('date_from').optional().isISO8601(),
    query('date_to').optional().isISO8601(),
    query('location_id').optional().isUUID(),
    query('sort').optional().isIn(['sale_date', 'created_at', 'quantity_sold', 'total_amount']),
    query('order').optional().isIn(['asc', 'desc']),
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
    const filters: SaleListFilters = {
      page: req.query.page != null ? Number(req.query.page) : undefined,
      limit: req.query.limit != null ? Number(req.query.limit) : undefined,
      product_id: req.query.product_id as string | undefined,
      date_from: req.query.date_from as string | undefined,
      date_to: req.query.date_to as string | undefined,
      location_id: req.query.location_id as string | undefined,
      sort: req.query.sort as string | undefined,
      order: req.query.order as 'asc' | 'desc' | undefined,
    };
    try {
      const result = await listSales(req.user.tenantId, filters);
      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list sales';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * GET /sales/:id
 * Get single sale
 */
router.get(
  '/:id',
  authenticateToken,
  [param('id').isUUID().withMessage('Invalid sale id')],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Invalid sale id',
        errors: errors.array(),
      });
      return;
    }
    const saleId = req.params.id as string;
    try {
      const sale = await getSaleById(req.user.tenantId, saleId);
      if (!sale) {
        res.status(404).json({ success: false, error: 'Sale not found' });
        return;
      }
      res.status(200).json({ success: true, data: sale });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get sale';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * POST /sales
 * Create sale (source = manual)
 */
router.post(
  '/',
  authenticateToken,
  [
    body('product_id').isUUID().withMessage('product_id is required and must be a valid UUID'),
    body('sale_date').optional().isISO8601().withMessage('Invalid sale_date'),
    body('quantity_sold').isFloat({ min: 0.01 }).withMessage('quantity_sold must be greater than 0'),
    body('unit_price').optional().isFloat({ min: 0 }).withMessage('unit_price must be >= 0'),
    body('location_id').optional().isUUID(),
    body('metadata').optional().isObject(),
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
    const input: SaleCreateInput = {
      product_id: req.body.product_id,
      sale_date: req.body.sale_date ?? new Date().toISOString(),
      quantity_sold: Number(req.body.quantity_sold),
      unit_price: req.body.unit_price != null ? Number(req.body.unit_price) : null,
      location_id: req.body.location_id ?? null,
      metadata: req.body.metadata,
    };
    try {
      const context = req.user?.userId ? { userId: req.user.userId } : undefined;
      const sale = await createSale(req.user.tenantId, input, context);
      res.status(201).json({ success: true, data: sale });
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      if (err.code === 'PRODUCT_NOT_FOUND') {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }
      if (err.code === 'LOCATION_NOT_FOUND') {
        res.status(404).json({ success: false, error: 'Location not found' });
        return;
      }
      if (err.code === 'VALIDATION') {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create sale',
      });
    }
  }
);

/**
 * PUT /sales/:id
 * Update sale
 */
router.put(
  '/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid sale id'),
    body('product_id').optional().isUUID(),
    body('sale_date').optional().isISO8601(),
    body('quantity_sold').optional().isFloat({ min: 0.01 }),
    body('unit_price').optional().isFloat({ min: 0 }),
    body('location_id').optional().isUUID(),
    body('metadata').optional().isObject(),
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
    const saleId = req.params.id as string;
    const input: SaleUpdateInput = {
      product_id: req.body.product_id,
      sale_date: req.body.sale_date,
      quantity_sold: req.body.quantity_sold != null ? Number(req.body.quantity_sold) : undefined,
      unit_price: req.body.unit_price !== undefined ? (req.body.unit_price != null ? Number(req.body.unit_price) : null) : undefined,
      location_id: req.body.location_id !== undefined ? req.body.location_id : undefined,
      metadata: req.body.metadata,
    };
    Object.keys(input).forEach((k) => {
      const key = k as keyof SaleUpdateInput;
      if (input[key] === undefined) delete input[key];
    });
    try {
      const sale = await updateSale(req.user.tenantId, saleId, input);
      if (!sale) {
        res.status(404).json({ success: false, error: 'Sale not found' });
        return;
      }
      res.status(200).json({ success: true, data: sale });
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      if (err.code === 'PRODUCT_NOT_FOUND') {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }
      if (err.code === 'LOCATION_NOT_FOUND') {
        res.status(404).json({ success: false, error: 'Location not found' });
        return;
      }
      if (err.code === 'VALIDATION') {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update sale',
      });
    }
  }
);

/**
 * DELETE /sales/:id
 * Delete sale (hard delete)
 */
router.delete(
  '/:id',
  authenticateToken,
  [param('id').isUUID().withMessage('Invalid sale id')],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Invalid sale id',
        errors: errors.array(),
      });
      return;
    }
    const saleId = req.params.id as string;
    try {
      const deleted = await deleteSale(req.user.tenantId, saleId);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Sale not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete sale',
      });
    }
  }
);

export default router;
