import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getDatabase } from '../database/connection';
import {
  generateRushToken,
  getRushTokensForTenant,
  revokeRushToken,
  validateRushToken,
} from '../services/rush-token.service';

const router = Router();

// ─── Routes protégées (gérant authentifié) ───────────────────────

// GET /rush/tokens — liste les tokens du tenant
router.get('/tokens', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false });
    return;
  }
  const tokens = await getRushTokensForTenant(req.user.tenantId);
  res.json({ success: true, data: tokens });
});

// POST /rush/tokens — génère un nouveau token
router.post('/tokens', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false });
    return;
  }
  const label = typeof req.body?.label === 'string' ? req.body.label : 'Écran cuisine';
  const token = await generateRushToken(req.user.tenantId, label);
  res.status(201).json({ success: true, data: token });
});

// DELETE /rush/tokens/:id — révoque un token
router.delete('/tokens/:id', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false });
    return;
  }
  await revokeRushToken(req.user.tenantId, req.params.id);
  res.json({ success: true });
});

// ─── Route publique (lecture seule, token URL) ────────────────────

// GET /rush/data?token=xxx — données stock pour l'écran cuisine
router.get('/data', async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : null;
  if (!token) {
    res.status(401).json({ success: false, error: 'Token manquant' });
    return;
  }

  const rushToken = await validateRushToken(token);
  if (!rushToken) {
    res.status(403).json({ success: false, error: 'Token invalide ou révoqué' });
    return;
  }

  const db = getDatabase();
  const tenantId = rushToken.tenant_id;

  try {
    const [productsResult, predictionsResult, tenantResult] = await Promise.all([
      db.queryWithTenant(
        tenantId,
        `SELECT id, name, sku, quantity, min_quantity, unit, stock_status
         FROM products
         WHERE tenant_id = $1 AND is_active = true
         ORDER BY
           CASE stock_status WHEN 'critical' THEN 0 WHEN 'low' THEN 1 ELSE 2 END,
           name ASC`,
        [tenantId]
      ),
      db.queryWithTenant(
        tenantId,
        `SELECT product_id, days_remaining, urgency
         FROM stock_predictions
         WHERE tenant_id = $1`,
        [tenantId]
      ),
      db.query<{ company_name: string }>(
        `SELECT company_name FROM tenants WHERE id = $1`,
        [tenantId]
      ),
    ]);

    const predictionsMap = new Map(predictionsResult.rows.map((p) => [p.product_id, p]));

    const products = productsResult.rows.map((p: any) => ({
      ...p,
      quantity: typeof p.quantity === 'number' ? p.quantity : parseFloat(String(p.quantity)),
      min_quantity: p.min_quantity == null ? null : (typeof p.min_quantity === 'number' ? p.min_quantity : parseFloat(String(p.min_quantity))),
      prediction: predictionsMap.get(p.id) ?? null,
    }));

    res.json({
      success: true,
      data: {
        restaurant_name: tenantResult.rows[0]?.company_name ?? 'Restaurant',
        products,
        fetched_at: new Date().toISOString(),
        critical_count: products.filter((p: any) => p.stock_status === 'critical').length,
        low_count: products.filter((p: any) => p.stock_status === 'low').length,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

export default router;

