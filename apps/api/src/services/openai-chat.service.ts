import OpenAI from 'openai';
import type { Pool, PoolClient } from 'pg';
import { getDatabase } from '../database/connection';
import { listProducts } from './product.service';
import type { Product } from '@bmad/shared';

const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 1024;
const MAX_HISTORY_MESSAGES = 20;

function getOpenAiClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY manquant');
  }
  return new OpenAI({ apiKey: key });
}

async function withTenantClient<T>(tenantId: string, pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('SELECT set_tenant_context($1::uuid)', [tenantId]);
    return await fn(client);
  } finally {
    client.release();
  }
}

const STOCK_STATUS_ORDER: Record<Product['stock_status'], number> = {
  critical: 0,
  low: 1,
  ok: 2,
};

function sortProductsForPrompt(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const da = STOCK_STATUS_ORDER[a.stock_status] ?? 2;
    const db = STOCK_STATUS_ORDER[b.stock_status] ?? 2;
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name, 'fr');
  });
}

// Construit le system prompt avec les données fraîches du restaurant (même source que /stocks : listProducts + queryWithTenant)
async function buildSystemPrompt(tenantId: string): Promise<string> {
  try {
    const db = getDatabase();
    const [listResult, summaryResult] = await Promise.allSettled([
      listProducts(tenantId, { limit: 40, page: 1 }),
      db.queryWithTenant<{
        total: string;
        critical_count: string;
        low_count: string;
        stock_value: string;
      }>(
        tenantId,
        `
        SELECT
          COUNT(*)::text AS total,
          SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END)::text AS critical_count,
          SUM(CASE
                WHEN quantity > 0
                 AND min_quantity IS NOT NULL
                 AND quantity <= min_quantity
                THEN 1 ELSE 0
              END)::text AS low_count,
          COALESCE(SUM(quantity * COALESCE(purchase_price, 0)), 0)::text AS stock_value
        FROM products
        WHERE tenant_id = $1 AND is_active = true
      `,
        [tenantId]
      ),
    ]);

    const stocks =
      listResult.status === 'fulfilled' ? sortProductsForPrompt(listResult.value.data) : [];
    const summaryRow =
      summaryResult.status === 'fulfilled'
        ? summaryResult.value.rows[0]
        : { total: '0', critical_count: '0', low_count: '0', stock_value: '0' };

    const stockLines = stocks
      .map((s) => {
        const threshold = s.min_quantity != null ? ` | seuil: ${s.min_quantity}` : '';
        const price = s.purchase_price != null ? ` | ${s.purchase_price}€/u` : '';
        return `• ${s.name}: ${s.quantity} ${s.unit}${threshold}${price} [${s.stock_status}]`;
      })
      .join('\n');

    const now = new Date().toLocaleString('fr-FR', {
      timeZone: 'Europe/Paris',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const total = parseInt(summaryRow?.total ?? '0', 10);
    const criticalCount = parseInt(summaryRow?.critical_count ?? '0', 10);
    const lowCount = parseInt(summaryRow?.low_count ?? '0', 10);
    const stockValue = parseFloat(summaryRow?.stock_value ?? '0');

    return `Tu es l'assistant IA de FlowStock, un logiciel de gestion de stocks pour restaurants.
Tu aides les équipes (serveurs, gérants, chefs) à gérer leurs stocks au quotidien.

DATE ET HEURE : ${now}

RÉSUMÉ DES STOCKS :
- Produits actifs     : ${total}
- En rupture critique : ${criticalCount}
- Stock faible        : ${lowCount}
- Valeur totale stock : ${stockValue.toFixed(2)}€

STOCKS EN DÉTAIL (triés par urgence) :
${stockLines || 'Aucun produit enregistré pour ce restaurant.'}

RÈGLES :
- Réponds TOUJOURS en français
- Sois concis et pratique (3-4 paragraphes max)
- Donne les chiffres exacts depuis les données ci-dessus
- Si un produit n'est pas listé, dis-le clairement
- Ne fabrique JAMAIS de données inexistantes
- Suggère des actions concrètes quand c'est pertinent
- Ton : professionnel et accessible, comme un collègue expert`;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Chat] buildSystemPrompt error:', err);
    return `Tu es l'assistant IA de FlowStock, un logiciel de gestion de stocks pour restaurants.
Réponds toujours en français de manière concise et utile.
Date : ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`;
  }
}

export interface SendMessageParams {
  tenantId: string;
  userId: string;
  conversationId: string | null;
  userMessage: string;
  pool: Pool;
}

export interface SendMessageResult {
  conversationId: string;
  response: string;
  tokensUsed: number;
}

export async function sendChatMessage(params: SendMessageParams): Promise<SendMessageResult> {
  const { tenantId, userId, conversationId, userMessage, pool } = params;

  return withTenantClient(tenantId, pool, async (client) => {
    const openai = getOpenAiClient();

    // 1) Créer ou récupérer la conversation
    let convId = conversationId;

    if (!convId) {
      const title = userMessage.substring(0, 60) + (userMessage.length > 60 ? '…' : '');
      const result = await client.query(
        `
        INSERT INTO chat_conversations (tenant_id, user_id, title)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
        [tenantId, userId, title]
      );
      convId = result.rows[0].id as string;
    } else {
      const check = await client.query(
        `
        SELECT id FROM chat_conversations
        WHERE id = $1 AND tenant_id = $2
      `,
        [convId, tenantId]
      );
      if (check.rows.length === 0) {
        throw new Error('Conversation non trouvée ou accès refusé');
      }
    }

    // 2) Historique (MAX_HISTORY_MESSAGES derniers messages)
    const historyResult = await client.query(
      `
      SELECT role, content
      FROM chat_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
      LIMIT $2
    `,
      [convId, MAX_HISTORY_MESSAGES]
    );

    const history = historyResult.rows.map((row) => ({
      role: row.role as 'user' | 'assistant',
      content: row.content as string,
    }));

    // 3) System prompt (données fraîches)
    const systemPrompt = await buildSystemPrompt(tenantId);

    // 4) Appel OpenAI (GPT-4o-mini)
    const completion = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessage },
      ],
    });

    const assistantContent = completion.choices[0]?.message?.content ?? 'Je ne peux pas répondre pour le moment.';
    const tokensUsed = (completion.usage?.prompt_tokens ?? 0) + (completion.usage?.completion_tokens ?? 0);

    // 5) Persister les 2 messages (pas de message "system" en DB)
    await client.query(
      `
      INSERT INTO chat_messages (conversation_id, role, content)
      VALUES ($1, 'user', $2), ($1, 'assistant', $3)
    `,
      [convId, userMessage, assistantContent]
    );

    // 6) Mettre à jour updated_at
    await client.query(
      `
      UPDATE chat_conversations
      SET updated_at = NOW()
      WHERE id = $1
    `,
      [convId]
    );

    return { conversationId: convId, response: assistantContent, tokensUsed };
  });
}

export async function getConversations(tenantId: string, pool: Pool) {
  return withTenantClient(tenantId, pool, async (client) => {
    const result = await client.query(
      `
      SELECT id, title, updated_at
      FROM chat_conversations
      WHERE tenant_id = $1
      ORDER BY updated_at DESC
      LIMIT 20
    `,
      [tenantId]
    );
    return result.rows;
  });
}

export async function getConversationHistory(conversationId: string, tenantId: string, pool: Pool) {
  return withTenantClient(tenantId, pool, async (client) => {
    const check = await client.query(
      `
      SELECT id FROM chat_conversations
      WHERE id = $1 AND tenant_id = $2
    `,
      [conversationId, tenantId]
    );
    if (check.rows.length === 0) throw new Error('Conversation non trouvée');

    const result = await client.query(
      `
      SELECT role, content, created_at
      FROM chat_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `,
      [conversationId]
    );
    return result.rows;
  });
}

