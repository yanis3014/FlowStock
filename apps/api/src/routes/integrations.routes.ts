import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { createSquareAuthorizeUrl, isSquareOAuthConfigured } from '../services/square-oauth.service';

const router = Router();

router.use(authenticateToken);

/**
 * GET /integrations/square/oauth-url
 * Retourne l’URL d’autorisation Square (secret applicatif uniquement côté serveur).
 */
router.get('/square/oauth-url', async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  if (!isSquareOAuthConfigured()) {
    res.status(503).json({
      success: false,
      error: 'Square OAuth is not configured on the server',
    });
    return;
  }
  try {
    const { authorizeUrl } = await createSquareAuthorizeUrl(req.user.tenantId);
    res.status(200).json({ success: true, data: { authorizeUrl } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Could not start Square connection' });
  }
});

export default router;
