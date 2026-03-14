import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { getDatabase } from '../database/connection';

const router = Router();

router.get('/progress', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) { res.status(401).json({ success: false }); return; }
  const db = getDatabase();
  const result = await db.query<{ onboarding_data: unknown; onboarding_completed: boolean }>(
    `SELECT settings->'onboarding' AS onboarding_data, onboarding_completed
     FROM tenants WHERE id = $1`,
    [req.user.tenantId]
  );
  const row = result.rows[0];
  res.json({ success: true, data: row ?? { onboarding_data: null, onboarding_completed: false } });
});

router.patch(
  '/progress',
  authenticateToken,
  [body('onboarding').notEmpty().isObject()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ success: false, error: 'Corps invalide' }); return; }
    if (!req.user?.tenantId) { res.status(401).json({ success: false }); return; }
    const db = getDatabase();
    await db.query(
      `UPDATE tenants
       SET settings = jsonb_set(COALESCE(settings, '{}'), '{onboarding}', $1::jsonb),
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(req.body.onboarding), req.user.tenantId]
    );
    res.json({ success: true });
  }
);

router.post(
  '/complete',
  authenticateToken,
  [body('type_cuisine').optional().isString().trim()],
  async (req: Request, res: Response) => {
    if (!req.user?.tenantId) { res.status(401).json({ success: false }); return; }
    const db = getDatabase();
    await db.query(
      `UPDATE tenants
       SET onboarding_completed = true,
           type_cuisine = COALESCE($1, type_cuisine),
           updated_at = NOW()
       WHERE id = $2`,
      [req.body.type_cuisine ?? null, req.user.tenantId]
    );
    res.json({ success: true });
  }
);

export default router;
