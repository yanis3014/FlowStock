import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { body, query, param, validationResult } from 'express-validator';
import {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  DUPLICATE_SUPPLIER_NAME_CODE,
  type SupplierListFilters,
} from '../services/supplier.service';
import type { SupplierCreateInput, SupplierUpdateInput } from '@bmad/shared';

const router = Router();

/**
 * GET /suppliers
 * List suppliers with pagination and optional is_active filter
 */
router.get(
  '/',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('is_active').optional().isBoolean().toBoolean(),
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
    const filters: SupplierListFilters = {
      page: req.query.page != null ? Number(req.query.page) : undefined,
      limit: req.query.limit != null ? Number(req.query.limit) : undefined,
      is_active:
        req.query.is_active === 'true'
          ? true
          : req.query.is_active === 'false'
            ? false
            : undefined,
    };
    try {
      const result = await listSuppliers(req.user.tenantId, filters);
      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list suppliers';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * GET /suppliers/:id
 * Get single supplier with products_count
 */
router.get(
  '/:id',
  authenticateToken,
  [param('id').isUUID().withMessage('Invalid supplier id')],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Invalid supplier id',
        errors: errors.array(),
      });
      return;
    }
    const supplierId = req.params.id as string;
    try {
      const supplier = await getSupplierById(req.user.tenantId, supplierId);
      if (!supplier) {
        res.status(404).json({ success: false, error: 'Supplier not found' });
        return;
      }
      res.status(200).json({ success: true, data: supplier });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get supplier';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * POST /suppliers
 * Create supplier (name required, unique per tenant; email valid format if provided)
 */
router.post(
  '/',
  authenticateToken,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('contact_name').optional().trim(),
    body('email').optional().trim().custom((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)).withMessage('Invalid email format'),
    body('phone').optional().trim(),
    body('address').optional().trim(),
    body('notes').optional().trim(),
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
    const input: SupplierCreateInput = {
      name: req.body.name,
      contact_name: req.body.contact_name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      notes: req.body.notes,
    };
    try {
      const supplier = await createSupplier(req.user.tenantId, input);
      res.status(201).json({ success: true, data: supplier });
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      if (err.code === DUPLICATE_SUPPLIER_NAME_CODE || err.code === '23505') {
        res.status(409).json({ success: false, error: 'A supplier with this name already exists' });
        return;
      }
      if (err.code === 'VALIDATION') {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create supplier',
      });
    }
  }
);

/**
 * PUT /suppliers/:id
 * Update supplier
 */
router.put(
  '/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid supplier id'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('contact_name').optional().trim(),
    body('email').optional().trim().custom((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)).withMessage('Invalid email format'),
    body('phone').optional().trim(),
    body('address').optional().trim(),
    body('notes').optional().trim(),
    body('is_active').optional().isBoolean().toBoolean(),
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
    const supplierId = req.params.id as string;
    const input: SupplierUpdateInput = {
      name: req.body.name,
      contact_name: req.body.contact_name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      notes: req.body.notes,
      is_active: req.body.is_active,
    };
    Object.keys(input).forEach((k) => {
      const key = k as keyof SupplierUpdateInput;
      if (input[key] === undefined) delete input[key];
    });
    try {
      const supplier = await updateSupplier(req.user.tenantId, supplierId, input);
      if (!supplier) {
        res.status(404).json({ success: false, error: 'Supplier not found' });
        return;
      }
      res.status(200).json({ success: true, data: supplier });
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      if (err.code === DUPLICATE_SUPPLIER_NAME_CODE || err.code === '23505') {
        res.status(409).json({ success: false, error: 'A supplier with this name already exists' });
        return;
      }
      if (err.code === 'VALIDATION') {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update supplier',
      });
    }
  }
);

/**
 * DELETE /suppliers/:id
 * Soft delete (set is_active = false)
 */
router.delete(
  '/:id',
  authenticateToken,
  [param('id').isUUID().withMessage('Invalid supplier id')],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Invalid supplier id',
        errors: errors.array(),
      });
      return;
    }
    const supplierId = req.params.id as string;
    try {
      const deleted = await deleteSupplier(req.user.tenantId, supplierId);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Supplier not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete supplier',
      });
    }
  }
);

export default router;
