import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { body, query, param, validationResult } from 'express-validator';
import {
  listLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  DUPLICATE_LOCATION_NAME_CODE,
  type LocationListFilters,
} from '../services/location.service';
import type { LocationCreateInput, LocationUpdateInput } from '@bmad/shared';

const router = Router();

/**
 * GET /locations
 * List locations with pagination and optional is_active filter
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
    const filters: LocationListFilters = {
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
      const result = await listLocations(req.user.tenantId, filters);
      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list locations';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * GET /locations/:id
 * Get single location with total_quantity
 */
router.get(
  '/:id',
  authenticateToken,
  [param('id').isUUID().withMessage('Invalid location id')],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Invalid location id',
        errors: errors.array(),
      });
      return;
    }
    const locationId = req.params.id as string;
    try {
      const location = await getLocationById(req.user.tenantId, locationId);
      if (!location) {
        res.status(404).json({ success: false, error: 'Location not found' });
        return;
      }
      res.status(200).json({ success: true, data: location });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get location';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * POST /locations
 * Create location (name required, unique per tenant)
 */
router.post(
  '/',
  authenticateToken,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('address').optional().trim(),
    body('location_type').optional().trim(),
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
    const input: LocationCreateInput = {
      name: req.body.name,
      address: req.body.address,
      location_type: req.body.location_type,
    };
    try {
      const location = await createLocation(req.user.tenantId, input);
      res.status(201).json({ success: true, data: location });
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      if (err.code === DUPLICATE_LOCATION_NAME_CODE || err.code === '23505') {
        res.status(409).json({ success: false, error: 'A location with this name already exists' });
        return;
      }
      if (err.code === 'VALIDATION') {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create location',
      });
    }
  }
);

/**
 * PUT /locations/:id
 * Update location
 */
router.put(
  '/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid location id'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('address').optional().trim(),
    body('location_type').optional().trim(),
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
    const locationId = req.params.id as string;
    const input: LocationUpdateInput = {
      name: req.body.name,
      address: req.body.address,
      location_type: req.body.location_type,
      is_active: req.body.is_active,
    };
    // Remove undefined keys so we don't overwrite with undefined
    if (input.name === undefined) delete input.name;
    if (input.address === undefined) delete input.address;
    if (input.location_type === undefined) delete input.location_type;
    if (input.is_active === undefined) delete input.is_active;
    try {
      const location = await updateLocation(req.user.tenantId, locationId, input);
      if (!location) {
        res.status(404).json({ success: false, error: 'Location not found' });
        return;
      }
      res.status(200).json({ success: true, data: location });
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      if (err.code === DUPLICATE_LOCATION_NAME_CODE || err.code === '23505') {
        res.status(409).json({ success: false, error: 'A location with this name already exists' });
        return;
      }
      if (err.code === 'VALIDATION') {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update location',
      });
    }
  }
);

/**
 * DELETE /locations/:id
 * Soft delete (set is_active = false)
 */
router.delete(
  '/:id',
  authenticateToken,
  [param('id').isUUID().withMessage('Invalid location id')],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Invalid location id',
        errors: errors.array(),
      });
      return;
    }
    const locationId = req.params.id as string;
    try {
      const deleted = await deleteLocation(req.user.tenantId, locationId);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Location not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete location',
      });
    }
  }
);

export default router;
