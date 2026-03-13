/**
 * Invoice Routes — Epic 7 : Upload facture fournisseur & OCR
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { body, query, param, validationResult } from 'express-validator';
import {
  uploadAndExtractOCR,
  validateInvoice,
  listInvoices,
} from '../services/invoice.service';
import type { ValidateInvoiceInput } from '@bmad/shared';

const router = Router();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Utilisez JPG, PNG ou PDF.'));
    }
  },
});

/**
 * POST /invoices/upload
 * Upload a file, run OCR, and return extraction result.
 */
router.post(
  '/upload',
  authenticateToken,
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Aucun fichier reçu' });
      return;
    }

    try {
      const result = await uploadAndExtractOCR(
        req.user.tenantId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'extraction OCR';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/**
 * POST /invoices/:id/validate
 * Validate invoice lines, match products, and update stocks.
 */
router.post(
  '/:id/validate',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invoice id invalide'),
    body('lines').isArray({ min: 1 }).withMessage('Au moins une ligne est requise'),
    body('lines.*.designation').isString().notEmpty().withMessage('La désignation est requise'),
    body('lines.*.quantite').isNumeric().withMessage('La quantité doit être un nombre'),
  ],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg ?? 'Validation failed', errors: errors.array() });
      return;
    }

    const invoiceId = req.params.id as string;
    const input = req.body as ValidateInvoiceInput;

    try {
      const result = await validateInvoice(
        req.user.tenantId,
        invoiceId,
        input.lines,
        input.supplier_name ?? null,
        input.invoice_date ?? null,
        req.user.userId ?? null
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la validation';
      const status = message === 'Facture introuvable' ? 404 : 500;
      res.status(status).json({ success: false, error: message });
    }
  }
);

/**
 * GET /invoices
 * List invoices for tenant.
 */
router.get(
  '/',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg ?? 'Validation failed' });
      return;
    }

    const page = req.query.page != null ? Number(req.query.page) : 1;
    const limit = req.query.limit != null ? Number(req.query.limit) : 20;

    try {
      const result = await listInvoices(req.user.tenantId, page, limit);
      res.status(200).json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la récupération';
      res.status(500).json({ success: false, error: message });
    }
  }
);

export default router;
