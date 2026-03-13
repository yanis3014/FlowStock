import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  getDashboardSummary, 
  updateTenantAlertThreshold,
  getTenantAlertThresholdSetting,
  markAlertAsRead,
  getRecentMovements,
  getDailyConsumption,
} from '../services/dashboard.service';
import { getSyncStatus } from '../services/pos-sync-status.service';

const router = Router();

/**
 * GET /dashboard/summary
 * Get dashboard summary data (sales yesterday, current stock, alerts, etc.)
 */
router.get('/summary', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  try {
    const summary = await getDashboardSummary(req.user.tenantId, req.user.userId);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get dashboard summary';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /dashboard/alert-threshold
 * Get current alert threshold setting for tenant
 */
router.get('/alert-threshold', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  try {
    const threshold = await getTenantAlertThresholdSetting(req.user.tenantId);
    res.status(200).json({ success: true, data: { thresholdPercent: threshold } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get alert threshold';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /dashboard/pos-sync-status (Story 2.5)
 * Returns POS sync status for the tenant: is_degraded, last_event_at, failure_count.
 */
router.get('/pos-sync-status', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  try {
    const status = await getSyncStatus(req.user.tenantId);
    if (status === null) {
      res.status(200).json({ success: true, data: { is_degraded: false, last_event_at: null, degraded_since: null, failure_count: 0 } });
      return;
    }
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get POS sync status';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PUT /dashboard/alert-threshold
 * Update alert threshold setting for tenant
 */
router.put('/alert-threshold', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  
  const { thresholdPercent } = req.body;
  if (typeof thresholdPercent !== 'number' || !Number.isFinite(thresholdPercent)) {
    res.status(400).json({ success: false, error: 'thresholdPercent must be a finite number' });
    return;
  }
  
  try {
    await updateTenantAlertThreshold(req.user.tenantId, thresholdPercent);
    res.status(200).json({ success: true, data: { thresholdPercent } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update alert threshold';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /dashboard/alerts/read
 * Mark one or more alerts as read for the authenticated user (Story 4.4)
 */
router.post('/alerts/read', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId || !req.user?.userId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  const { alert_ids } = req.body;
  if (!Array.isArray(alert_ids) || alert_ids.length === 0) {
    res.status(400).json({ success: false, error: 'alert_ids must be a non-empty array' });
    return;
  }
  try {
    await Promise.all(
      alert_ids.map((id: string) => markAlertAsRead(req.user!.tenantId!, req.user!.userId!, id))
    );
    res.status(200).json({ success: true, data: { marked: alert_ids.length } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark alerts as read';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /dashboard/recent-movements
 * Get the N most recent stock movements across all products (Story 4.2)
 */
router.get('/recent-movements', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '5'), 10), 1), 20);
  try {
    const movements = await getRecentMovements(req.user.tenantId, limit);
    res.status(200).json({ success: true, data: movements });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get recent movements';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /dashboard/daily-consumption
 * Get daily sales consumption for the last N days (Story 4.2 météo stock widget)
 */
router.get('/daily-consumption', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user?.tenantId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  const days = Math.min(Math.max(parseInt(String(req.query.days ?? '7'), 10), 1), 90);
  try {
    const data = await getDailyConsumption(req.user.tenantId, days);
    res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get daily consumption';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
