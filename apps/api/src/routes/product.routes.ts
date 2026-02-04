import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { body, query, param, validationResult } from 'express-validator';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductListFilters,
} from '../services/product.service';
import type { ProductCreateInput, ProductUpdateInput, ProductUnit } from '@bmad/shared';

const router = Router();
const VALID_UNITS: ProductUnit[] = ['piece', 'kg', 'liter', 'box', 'pack'];

/**
 * GET /products
 * List products with pagination and filters
 */
router.get(
  '/',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
    query('location_id').optional().isUUID(),
    query('supplier_id').optional().isUUID(),
    query('low_stock').optional().isBoolean().toBoolean(),
    query('sort').optional().isIn(['created_at', 'updated_at', 'name', 'sku', 'quantity']),
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
    const pageVal = req.query.page;
    const limitVal = req.query.limit;
    const lowStockVal = req.query.low_stock;
    const filters: ProductListFilters = {
      page: pageVal != null ? parseInt(String(pageVal), 10) : undefined,
      limit: limitVal != null ? parseInt(String(limitVal), 10) : undefined,
      search: req.query.search as string | undefined,
      location_id: req.query.location_id as string | undefined,
      supplier_id: req.query.supplier_id as string | undefined,
      low_stock:
        lowStockVal === 'true' ? true : lowStockVal === 'false' ? false : undefined,
      sort: req.query.sort as string | undefined,
      order: req.query.order as 'asc' | 'desc' | undefined,
    };
    try {
      const result = await listProducts(req.user.tenantId, filters);
      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list products';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * GET /products/:id
 * Get single product
 */
router.get(
  '/:id',
  authenticateToken,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Invalid product id',
        errors: errors.array(),
      });
      return;
    }
    const productId = req.params.id as string;
    try {
      const product = await getProductById(req.user.tenantId, productId);
      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }
      res.status(200).json({ success: true, data: product });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get product';
      res.status(500).json({ success: false, error: message });
    }
  }
);

const createProductValidation = [
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional().trim(),
  body('unit').optional().isIn(VALID_UNITS).withMessage(`Unit must be one of: ${VALID_UNITS.join(', ')}`),
  body('quantity').optional().isFloat({ min: 0 }).withMessage('Quantity must be >= 0'),
  body('min_quantity').optional().isFloat({ min: 0 }).withMessage('Min quantity must be >= 0'),
  body('location_id').optional().isUUID().withMessage('Invalid location_id'),
  body('supplier_id').optional().isUUID().withMessage('Invalid supplier_id'),
  body('purchase_price').optional().isFloat({ min: 0 }).withMessage('Purchase price must be >= 0'),
  body('selling_price').optional().isFloat({ min: 0 }).withMessage('Selling price must be >= 0'),
  body('lead_time_days').optional().isInt({ min: 0 }).withMessage('Lead time days must be >= 0'),
];

/**
 * POST /products
 * Create new product
 */
router.post(
  '/',
  authenticateToken,
  createProductValidation,
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
    const input: ProductCreateInput = {
      sku: req.body.sku,
      name: req.body.name,
      description: req.body.description,
      unit: req.body.unit,
      quantity: req.body.quantity,
      min_quantity: req.body.min_quantity,
      location_id: req.body.location_id,
      supplier_id: req.body.supplier_id,
      purchase_price: req.body.purchase_price,
      selling_price: req.body.selling_price,
      lead_time_days: req.body.lead_time_days,
    };
    try {
      const product = await createProduct(req.user.tenantId, input);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes('SKU already exists')) {
        res.status(409).json({ success: false, error: 'SKU already exists for this tenant' });
        return;
      }
      if (err.message?.includes('required') || err.message?.includes('must be')) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to create product' });
    }
  }
);

const updateProductValidation = [
  param('id').isUUID(),
  body('sku').optional().trim().notEmpty(),
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('unit').optional().isIn(VALID_UNITS).withMessage(`Unit must be one of: ${VALID_UNITS.join(', ')}`),
  body('quantity').optional().isFloat({ min: 0 }).withMessage('Quantity must be >= 0'),
  body('min_quantity').optional().isFloat({ min: 0 }).withMessage('Min quantity must be >= 0'),
  body('location_id').optional().isUUID().withMessage('Invalid location_id'),
  body('supplier_id').optional().isUUID().withMessage('Invalid supplier_id'),
  body('purchase_price').optional().isFloat({ min: 0 }).withMessage('Purchase price must be >= 0'),
  body('selling_price').optional().isFloat({ min: 0 }).withMessage('Selling price must be >= 0'),
  body('lead_time_days').optional().isInt({ min: 0 }).withMessage('Lead time days must be >= 0'),
];

/**
 * PUT /products/:id
 * Update product
 */
router.put(
  '/:id',
  authenticateToken,
  updateProductValidation,
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
    const productId = req.params.id as string;
    const input: ProductUpdateInput = {};
    if (req.body.sku !== undefined) input.sku = req.body.sku;
    if (req.body.name !== undefined) input.name = req.body.name;
    if (req.body.description !== undefined) input.description = req.body.description;
    if (req.body.unit !== undefined) input.unit = req.body.unit;
    if (req.body.quantity !== undefined) input.quantity = req.body.quantity;
    if (req.body.min_quantity !== undefined) input.min_quantity = req.body.min_quantity;
    if (req.body.location_id !== undefined) input.location_id = req.body.location_id;
    if (req.body.supplier_id !== undefined) input.supplier_id = req.body.supplier_id;
    if (req.body.purchase_price !== undefined) input.purchase_price = req.body.purchase_price;
    if (req.body.selling_price !== undefined) input.selling_price = req.body.selling_price;
    if (req.body.lead_time_days !== undefined) input.lead_time_days = req.body.lead_time_days;
    try {
      const product = await updateProduct(req.user.tenantId, productId, input);
      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }
      res.status(200).json({ success: true, data: product });
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes('SKU already exists')) {
        res.status(409).json({ success: false, error: 'SKU already exists for this tenant' });
        return;
      }
      if (err.message?.includes('must be')) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to update product' });
    }
  }
);

/**
 * DELETE /products/:id
 * Soft delete product (is_active = false)
 */
router.delete(
  '/:id',
  authenticateToken,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Invalid product id',
        errors: errors.array(),
      });
      return;
    }
    const productId = req.params.id as string;
    try {
      const deleted = await deleteProduct(req.user.tenantId, productId);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete product';
      res.status(500).json({ success: false, error: message });
    }
  }
);

export default router;
