import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth';
import { getConversations, getConversationHistory, sendChatMessage } from '../services/openai-chat.service';

export function createChatRouter(pool: Pool): Router {
  const router = Router();

  router.use(authenticateToken);

  // POST /chat/message
  router.post('/message', async (req: Request, res: Response) => {
    try {
      const message = typeof req.body?.message === 'string' ? req.body.message : '';
      const conversation_id = req.body?.conversation_id;
      const tenantId = req.user?.tenantId ?? (req.user as { tenant_id?: string } | undefined)?.tenant_id;
      const userId = req.user?.userId ?? (req.user as { user_id?: string; id?: string } | undefined)?.user_id ?? (req.user as { id?: string } | undefined)?.id;

      if (!message?.trim()) {
        res.status(400).json({ success: false, error: 'Le message ne peut pas être vide' });
        return;
      }
      if (!tenantId || !userId) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }
      if (message.length > 2000) {
        res.status(400).json({ success: false, error: 'Message trop long (max 2000 caractères)' });
        return;
      }

      const result = await sendChatMessage({
        tenantId,
        userId,
        conversationId: typeof conversation_id === 'string' ? conversation_id : null,
        userMessage: message.trim(),
        pool,
      });

      res.json({
        success: true,
        data: {
          conversation_id: result.conversationId,
          response: result.response,
          tokens_used: result.tokensUsed,
        },
      });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('[Chat] sendMessage error FULL:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: (error as { constructor?: { name?: string } } | null)?.constructor?.name,
        status: (error as { status?: unknown } | null)?.status,
        code: (error as { code?: unknown } | null)?.code,
        response: (error as { response?: { data?: unknown } } | null)?.response?.data,
      });
      // Erreurs OpenAI spécifiques
      if (error instanceof Error) {
        if (error.message.includes('429')) {
          res.status(429).json({
            success: false,
            error: 'Quota OpenAI dépassé. Réessayez dans quelques instants.',
          });
          return;
        }
        if (error.message.includes('401') || error.message.toLowerCase().includes('api key')) {
          res.status(500).json({
            success: false,
            error: "Clé API OpenAI invalide. Contactez l'administrateur.",
          });
          return;
        }
      }

      res.status(500).json({ success: false, error: "Erreur lors de l'envoi du message" });
    }
  });

  // GET /chat/conversations
  router.get('/conversations', async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }
      const conversations = await getConversations(tenantId, pool);
      res.json({ success: true, data: { conversations } });
    } catch {
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  });

  // GET /chat/history?conversation_id=xxx
  router.get('/history', async (req: Request, res: Response) => {
    try {
      const conversation_id = req.query?.conversation_id;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }
      if (!conversation_id || typeof conversation_id !== 'string') {
        res.status(400).json({ success: false, error: 'conversation_id requis' });
        return;
      }

      const messages = await getConversationHistory(conversation_id, tenantId, pool);
      res.json({ success: true, data: { messages } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur serveur';
      const status = msg === 'Conversation non trouvée' ? 404 : 500;
      res.status(status).json({ success: false, error: msg });
    }
  });

  return router;
}

