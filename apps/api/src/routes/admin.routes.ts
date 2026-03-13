import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { getDatabase } from '../database/connection';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import type { SubscriptionTier } from '../services/subscription.service';

interface SubscriptionCountRow {
  tier: SubscriptionTier;
  count: string;
}

const VALID_TIERS: SubscriptionTier[] = ['normal', 'premium', 'premium_plus'];

const router = Router();

router.use(adminAuthMiddleware);

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const [totalUsers, totalRestaurants, subscriptionCounts, recentSignups, monthlyRevenue] =
      await Promise.all([
        db.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM users
           WHERE role IN ('user', 'owner')`
        ),
        db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM tenants'),
        db.query<SubscriptionCountRow>(
          `SELECT tier, COUNT(*)::text AS count
           FROM subscriptions
           GROUP BY tier`
        ),
        db.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM users
           WHERE created_at > NOW() - INTERVAL '30 days'`
        ),
        db.query<{ amount: string }>(
          `SELECT COALESCE(SUM(
             CASE tier
               WHEN 'normal' THEN 29
               WHEN 'premium' THEN 89
               WHEN 'premium_plus' THEN 149
               ELSE 0
             END
           ), 0)::text AS amount
           FROM subscriptions
           WHERE status IN ('active', 'trial', 'past_due')`
        ),
      ]);

    const byTier = new Map(
      subscriptionCounts.rows.map((row) => [row.tier, parseInt(row.count, 10)])
    );

    res.json({
      success: true,
      data: {
        totalUsers: parseInt(totalUsers.rows[0]?.count ?? '0', 10),
        totalRestaurants: parseInt(totalRestaurants.rows[0]?.count ?? '0', 10),
        recentSignups: parseInt(recentSignups.rows[0]?.count ?? '0', 10),
        monthlyRevenue: parseInt(monthlyRevenue.rows[0]?.amount ?? '0', 10),
        subscriptions: {
          normal: byTier.get('normal') ?? 0,
          premium: byTier.get('premium') ?? 0,
          premium_plus: byTier.get('premium_plus') ?? 0,
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      code: 'SERVER_ERROR',
    });
  }
});

router.get(
  '/users',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Validation failed',
      });
      return;
    }

    try {
      const db = getDatabase();
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const search = String(req.query.search ?? '').trim();
      const offset = (page - 1) * limit;

      const hasSearch = search.length > 0;
      const where = hasSearch
        ? `WHERE (
             COALESCE(u.first_name, '') ILIKE $3
             OR COALESCE(u.last_name, '') ILIKE $3
             OR u.email ILIKE $3
             OR t.company_name ILIKE $3
           )`
        : '';

      const params: Array<string | number> = hasSearch
        ? [limit, offset, `%${search}%`]
        : [limit, offset];

      const usersResult = await db.query<{
        id: string;
        tenant_id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        role: string;
        is_active: boolean;
        email_verified: boolean;
        created_at: string;
        last_login_at: string | null;
        company_name: string;
        slug: string;
        subscription_tier: SubscriptionTier | null;
        subscription_status: string | null;
      }>(
        `SELECT
           u.id,
           u.tenant_id,
           u.email,
           u.first_name,
           u.last_name,
           u.role,
           u.is_active,
           u.email_verified,
           u.created_at,
           u.last_login_at,
           t.company_name,
           t.slug,
           s.tier AS subscription_tier,
           s.status AS subscription_status
         FROM users u
         JOIN tenants t ON t.id = u.tenant_id
         LEFT JOIN subscriptions s ON s.tenant_id = u.tenant_id
         ${where}
         ORDER BY u.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      );

      const countResult = await db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM users u
         JOIN tenants t ON t.id = u.tenant_id
         ${
           hasSearch
             ? `WHERE (
                  COALESCE(u.first_name, '') ILIKE $1
                  OR COALESCE(u.last_name, '') ILIKE $1
                  OR u.email ILIKE $1
                  OR t.company_name ILIKE $1
                )`
             : ''
         }`,
        hasSearch ? [`%${search}%`] : []
      );

      const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

      res.json({
        success: true,
        data: {
          users: usersResult.rows.map((row) => ({
            ...row,
            name:
              `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() ||
              row.email.split('@')[0],
            onboarding_completed: false,
            suspended: !row.is_active,
          })),
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          },
        },
      });
    } catch {
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        code: 'SERVER_ERROR',
      });
    }
  }
);

router.get(
  '/users/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Invalid user id',
      });
      return;
    }

    try {
      const db = getDatabase();
      const { id } = req.params;

      const userResult = await db.query<{
        id: string;
        tenant_id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        role: string;
        is_active: boolean;
        email_verified: boolean;
        created_at: string;
        last_login_at: string | null;
        company_name: string;
        slug: string;
        subscription_id: string | null;
        subscription_tier: SubscriptionTier | null;
        subscription_status: string | null;
      }>(
        `SELECT
           u.id,
           u.tenant_id,
           u.email,
           u.first_name,
           u.last_name,
           u.role,
           u.is_active,
           u.email_verified,
           u.created_at,
           u.last_login_at,
           t.company_name,
           t.slug,
           s.id AS subscription_id,
           s.tier AS subscription_tier,
           s.status AS subscription_status
         FROM users u
         JOIN tenants t ON t.id = u.tenant_id
         LEFT JOIN subscriptions s ON s.tenant_id = u.tenant_id
         WHERE u.id = $1`,
        [id]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Utilisateur introuvable',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      const user = userResult.rows[0];

      const [productCount, salesCount] = await Promise.all([
        db.query<{ count: string }>(
          'SELECT COUNT(*)::text AS count FROM products WHERE tenant_id = $1',
          [user.tenant_id]
        ),
        db.query<{ count: string }>(
          'SELECT COUNT(*)::text AS count FROM sales WHERE tenant_id = $1',
          [user.tenant_id]
        ),
      ]);

      res.json({
        success: true,
        data: {
          ...user,
          name:
            `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() ||
            user.email.split('@')[0],
          onboarding_completed: false,
          suspended: !user.is_active,
          productCount: parseInt(productCount.rows[0]?.count ?? '0', 10),
          salesCount: parseInt(salesCount.rows[0]?.count ?? '0', 10),
        },
      });
    } catch {
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        code: 'SERVER_ERROR',
      });
    }
  }
);

router.patch(
  '/users/:id',
  [
    param('id').isUUID(),
    body('role').optional().isIn(['user', 'admin']),
    body('suspended').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Validation failed',
      });
      return;
    }

    try {
      const db = getDatabase();
      const { id } = req.params;
      const role = req.body.role as 'user' | 'admin' | undefined;
      const suspended = req.body.suspended as boolean | undefined;

      if (id === req.user?.userId && role === 'user') {
        res.status(400).json({
          success: false,
          error: 'Vous ne pouvez pas retirer vos propres droits admin',
          code: 'SELF_DEMOTION',
        });
        return;
      }

      if (id === req.user?.userId && suspended === true) {
        res.status(400).json({
          success: false,
          error: 'Vous ne pouvez pas suspendre votre propre compte',
          code: 'SELF_SUSPEND',
        });
        return;
      }

      const updates: string[] = [];
      const values: Array<string | boolean> = [];
      let paramIdx = 1;

      if (role !== undefined) {
        updates.push(`role = $${paramIdx++}`);
        values.push(role);
      }
      if (suspended !== undefined) {
        updates.push(`is_active = $${paramIdx++}`);
        values.push(!suspended);
      }

      if (updates.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Aucun champ à modifier',
          code: 'NO_UPDATES',
        });
        return;
      }

      values.push(id);
      const updateResult = await db.query(
        `UPDATE users
         SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramIdx}
         RETURNING id`,
        values
      );

      if (updateResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Utilisateur introuvable',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.json({ success: true });
    } catch {
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        code: 'SERVER_ERROR',
      });
    }
  }
);

router.delete(
  '/users/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Invalid user id',
      });
      return;
    }

    try {
      const db = getDatabase();
      const { id } = req.params;

      if (id === req.user?.userId) {
        res.status(400).json({
          success: false,
          error: 'Vous ne pouvez pas supprimer votre propre compte',
          code: 'SELF_DELETE',
        });
        return;
      }

      const result = await db.query(
        `UPDATE users
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Utilisateur introuvable',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.json({ success: true });
    } catch {
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        code: 'SERVER_ERROR',
      });
    }
  }
);

router.get(
  '/restaurants',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Validation failed',
      });
      return;
    }

    try {
      const db = getDatabase();
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const search = String(req.query.search ?? '').trim();
      const offset = (page - 1) * limit;

      const hasSearch = search.length > 0;
      const where = hasSearch
        ? 'WHERE (t.company_name ILIKE $3 OR t.slug ILIKE $3)'
        : '';
      const params: Array<number | string> = hasSearch
        ? [limit, offset, `%${search}%`]
        : [limit, offset];

      const rows = await db.query<{
        id: string;
        company_name: string;
        slug: string;
        is_active: boolean;
        created_at: string;
        user_count: string;
        product_count: string;
        subscription_tier: SubscriptionTier | null;
        subscription_status: string | null;
      }>(
        `SELECT
           t.id,
           t.company_name,
           t.slug,
           t.is_active,
           t.created_at,
           COALESCE(u.user_count, 0)::text AS user_count,
           COALESCE(p.product_count, 0)::text AS product_count,
           s.tier AS subscription_tier,
           s.status AS subscription_status
         FROM tenants t
         LEFT JOIN (
           SELECT tenant_id, COUNT(*) AS user_count
           FROM users
           GROUP BY tenant_id
         ) u ON u.tenant_id = t.id
         LEFT JOIN (
           SELECT tenant_id, COUNT(*) AS product_count
           FROM products
           GROUP BY tenant_id
         ) p ON p.tenant_id = t.id
         LEFT JOIN subscriptions s ON s.tenant_id = t.id
         ${where}
         ORDER BY t.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      );

      const count = await db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM tenants t
         ${hasSearch ? 'WHERE (t.company_name ILIKE $1 OR t.slug ILIKE $1)' : ''}`,
        hasSearch ? [`%${search}%`] : []
      );

      const total = parseInt(count.rows[0]?.count ?? '0', 10);

      res.json({
        success: true,
        data: {
          restaurants: rows.rows.map((row) => ({
            ...row,
            user_count: parseInt(row.user_count, 10),
            product_count: parseInt(row.product_count, 10),
          })),
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          },
        },
      });
    } catch {
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        code: 'SERVER_ERROR',
      });
    }
  }
);

router.get(
  '/restaurants/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Invalid restaurant id',
      });
      return;
    }

    try {
      const db = getDatabase();
      const { id } = req.params;

      const tenant = await db.query<{
        id: string;
        company_name: string;
        slug: string;
        industry: string | null;
        created_at: string;
        is_active: boolean;
        subscription_tier: SubscriptionTier | null;
        subscription_status: string | null;
      }>(
        `SELECT
           t.id,
           t.company_name,
           t.slug,
           t.industry,
           t.created_at,
           t.is_active,
           s.tier AS subscription_tier,
           s.status AS subscription_status
         FROM tenants t
         LEFT JOIN subscriptions s ON s.tenant_id = t.id
         WHERE t.id = $1`,
        [id]
      );

      if (tenant.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Restaurant introuvable',
          code: 'RESTAURANT_NOT_FOUND',
        });
        return;
      }

      const [users, productsCount, salesCount] = await Promise.all([
        db.query<{
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          role: string;
          is_active: boolean;
          created_at: string;
          last_login_at: string | null;
        }>(
          `SELECT id, email, first_name, last_name, role, is_active, created_at, last_login_at
           FROM users
           WHERE tenant_id = $1
           ORDER BY created_at DESC`,
          [id]
        ),
        db.query<{ count: string }>(
          'SELECT COUNT(*)::text AS count FROM products WHERE tenant_id = $1',
          [id]
        ),
        db.query<{ count: string }>(
          'SELECT COUNT(*)::text AS count FROM sales WHERE tenant_id = $1',
          [id]
        ),
      ]);

      res.json({
        success: true,
        data: {
          ...tenant.rows[0],
          users: users.rows.map((user) => ({
            ...user,
            name:
              `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() ||
              user.email.split('@')[0],
            suspended: !user.is_active,
          })),
          productCount: parseInt(productsCount.rows[0]?.count ?? '0', 10),
          salesCount: parseInt(salesCount.rows[0]?.count ?? '0', 10),
        },
      });
    } catch {
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        code: 'SERVER_ERROR',
      });
    }
  }
);

router.get(
  '/subscriptions',
  [
    query('tier').optional().isIn(VALID_TIERS),
    query('status').optional().isIn(['active', 'cancelled', 'past_due', 'trial']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Validation failed',
      });
      return;
    }

    try {
      const db = getDatabase();
      const tier = req.query.tier as SubscriptionTier | undefined;
      const status = req.query.status as
        | 'active'
        | 'cancelled'
        | 'past_due'
        | 'trial'
        | undefined;
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: Array<string | number> = [];
      let idx = 1;

      if (tier) {
        conditions.push(`s.tier = $${idx++}`);
        values.push(tier);
      }
      if (status) {
        conditions.push(`s.status = $${idx++}`);
        values.push(status);
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      values.push(limit, offset);

      const subscriptions = await db.query<{
        id: string;
        tenant_id: string;
        tier: SubscriptionTier;
        status: string;
        created_at: string;
        updated_at: string;
        trial_ends_at: string | null;
        current_period_end: string | null;
        company_name: string;
        user_email: string | null;
        user_name: string | null;
      }>(
        `SELECT
           s.id,
           s.tenant_id,
           s.tier,
           s.status,
           s.created_at,
           s.updated_at,
           s.trial_ends_at,
           s.current_period_end,
           t.company_name,
           owner.email AS user_email,
           owner.name AS user_name
         FROM subscriptions s
         JOIN tenants t ON t.id = s.tenant_id
         LEFT JOIN LATERAL (
           SELECT
             u.email,
             NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), '') AS name
           FROM users u
           WHERE u.tenant_id = t.id
           ORDER BY (u.role = 'owner') DESC, u.created_at ASC
           LIMIT 1
         ) owner ON true
         ${where}
         ORDER BY s.created_at DESC
         LIMIT $${idx++} OFFSET $${idx}`,
        values
      );

      const countValues = values.slice(0, values.length - 2);
      const total = await db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM subscriptions s
         ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}`,
        countValues
      );

      const totalCount = parseInt(total.rows[0]?.count ?? '0', 10);

      res.json({
        success: true,
        data: {
          subscriptions: subscriptions.rows,
          pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(totalCount / limit)),
          },
        },
      });
    } catch {
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        code: 'SERVER_ERROR',
      });
    }
  }
);

router.patch(
  '/subscriptions/:id',
  [
    param('id').isUUID(),
    body('tier').isIn(VALID_TIERS).withMessage('Tier invalide'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: errors.array()[0]?.msg ?? 'Validation failed',
        code: 'INVALID_TIER',
      });
      return;
    }

    try {
      const db = getDatabase();
      const { id } = req.params;
      const tier = req.body.tier as SubscriptionTier;

      const current = await db.query<{
        id: string;
        tenant_id: string;
        tier: SubscriptionTier;
      }>(
        'SELECT id, tenant_id, tier FROM subscriptions WHERE id = $1',
        [id]
      );

      if (current.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Abonnement introuvable',
          code: 'SUBSCRIPTION_NOT_FOUND',
        });
        return;
      }

      const row = current.rows[0];

      if (row.tier === tier) {
        res.json({ success: true });
        return;
      }

      await db.query(
        'UPDATE subscriptions SET tier = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [tier, id]
      );

      await db.query(
        `INSERT INTO subscription_changes (tenant_id, subscription_id, old_tier, new_tier, changed_by_user_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.tenant_id, id, row.tier, tier, req.user?.userId ?? null]
      );

      res.json({ success: true });
    } catch {
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * GET /api/admin/ml-monitoring
 * Global ML prediction accuracy overview (Story 6-5).
 */
router.get('/ml-monitoring', async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const [tenantsResult, globalAccuracy, lowAccuracyAlerts, totalPredictions] =
      await Promise.all([
        db.query<{ id: string; company_name: string }>(
          `SELECT id, company_name FROM tenants WHERE is_active = true ORDER BY company_name`
        ),
        db.query<{ avg_accuracy: string; sample_count: string }>(
          `SELECT
             AVG(accuracy_score)::text AS avg_accuracy,
             COUNT(*)::text AS sample_count
           FROM prediction_accuracy
           WHERE evaluation_date >= CURRENT_DATE - 30`
        ),
        db.query<{ count: string }>(
          `SELECT COUNT(DISTINCT product_id)::text AS count
           FROM (
             SELECT product_id, AVG(accuracy_score) AS avg_acc
             FROM prediction_accuracy
             WHERE evaluation_date >= CURRENT_DATE - 30
             GROUP BY product_id
             HAVING AVG(accuracy_score) < 0.7
           ) low`
        ),
        db.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM stock_predictions`
        ),
      ]);

    const tenantAccuracyRows = await db.query<{
      tenant_id: string;
      company_name: string;
      avg_accuracy: string;
      sample_count: string;
      low_accuracy_products: string;
    }>(
      `SELECT
         pa.tenant_id,
         t.company_name,
         AVG(pa.accuracy_score)::text AS avg_accuracy,
         COUNT(*)::text AS sample_count,
         COUNT(CASE WHEN pa.accuracy_score < 0.7 THEN 1 END)::text AS low_accuracy_products
       FROM prediction_accuracy pa
       JOIN tenants t ON t.id = pa.tenant_id
       WHERE pa.evaluation_date >= CURRENT_DATE - 30
       GROUP BY pa.tenant_id, t.company_name
       ORDER BY AVG(pa.accuracy_score) ASC`
    );

    res.json({
      success: true,
      data: {
        global: {
          avg_accuracy: parseFloat(globalAccuracy.rows[0]?.avg_accuracy ?? '0') || 0,
          sample_count: parseInt(globalAccuracy.rows[0]?.sample_count ?? '0', 10),
          low_accuracy_alerts: parseInt(lowAccuracyAlerts.rows[0]?.count ?? '0', 10),
          total_predictions: parseInt(totalPredictions.rows[0]?.count ?? '0', 10),
          active_tenants: tenantsResult.rows.length,
        },
        by_tenant: tenantAccuracyRows.rows.map((r) => ({
          tenant_id: r.tenant_id,
          company_name: r.company_name,
          avg_accuracy: parseFloat(r.avg_accuracy) || 0,
          sample_count: parseInt(r.sample_count, 10),
          low_accuracy_products: parseInt(r.low_accuracy_products, 10),
        })),
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.get('/system', async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const [products, users, tenants, subscriptions] = await Promise.all([
      db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM products'),
      db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users'),
      db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM tenants'),
      db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM subscriptions'),
    ]);

    res.json({
      success: true,
      data: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
          totalProducts: parseInt(products.rows[0]?.count ?? '0', 10),
          totalUsers: parseInt(users.rows[0]?.count ?? '0', 10),
          totalRestaurants: parseInt(tenants.rows[0]?.count ?? '0', 10),
          totalSubscriptions: parseInt(subscriptions.rows[0]?.count ?? '0', 10),
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      data: {
        database: { status: 'error' },
      },
      error: 'Erreur serveur',
    });
  }
});

export default router;
