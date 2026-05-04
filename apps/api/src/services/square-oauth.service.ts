import crypto from 'crypto';
import { config } from '../config';
import { getDatabase } from '../database/connection';
import { encryptUtf8 } from '../utils/token-crypto';
import { logError } from '../utils/logger';

const STATE_TTL_MS = 15 * 60 * 1000;
const SQUARE_SCOPES = 'MERCHANT_PROFILE_READ ORDERS_READ';

export function isSquareOAuthConfigured(): boolean {
  return Boolean(
    config.SQUARE_APPLICATION_ID &&
      config.SQUARE_APPLICATION_SECRET &&
      config.SQUARE_REDIRECT_URI
  );
}

function squareApiBase(): string {
  return config.SQUARE_USE_SANDBOX
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';
}

function frontendRedirect(kind: 'error' | 'connected'): string {
  const base = config.FRONTEND_APP_URL.replace(/\/$/, '');
  return `${base}/parametres?square=${kind === 'error' ? 'error' : 'connected'}`;
}

/**
 * Crée un state OAuth et retourne l’URL d’autorisation Square (client_secret jamais exposé).
 */
export async function createSquareAuthorizeUrl(tenantId: string): Promise<{ authorizeUrl: string }> {
  if (!isSquareOAuthConfigured()) {
    throw new Error('Square OAuth is not configured (SQUARE_APPLICATION_ID, SQUARE_APPLICATION_SECRET, SQUARE_REDIRECT_URI)');
  }

  const stateToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + STATE_TTL_MS);

  const db = getDatabase();
  await db.query(
    `INSERT INTO square_oauth_states (state_token, tenant_id, expires_at)
     VALUES ($1, $2, $3)`,
    [stateToken, tenantId, expiresAt.toISOString()]
  );

  const base = squareApiBase();
  const params = new URLSearchParams({
    client_id: config.SQUARE_APPLICATION_ID!,
    scope: SQUARE_SCOPES,
    session: 'false',
    state: stateToken,
  });

  return {
    authorizeUrl: `${base}/oauth2/authorize?${params.toString()}`,
  };
}

interface SquareTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  merchant_id?: string;
}

async function exchangeAuthorizationCode(code: string): Promise<SquareTokenResponse> {
  const base = squareApiBase();
  const res = await fetch(`${base}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
    },
    body: JSON.stringify({
      client_id: config.SQUARE_APPLICATION_ID,
      client_secret: config.SQUARE_APPLICATION_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.SQUARE_REDIRECT_URI,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as SquareTokenResponse & { message?: string; errors?: unknown[] };

  if (!res.ok) {
    logError(new Error(`Square token exchange failed: ${res.status}`), {
      context: 'square_oauth_token_exchange',
      squareMessage: body?.message,
    });
    throw new Error('token_exchange_failed');
  }

  if (!body.access_token || !body.merchant_id) {
    logError(new Error('Square token response missing fields'), { context: 'square_oauth_token_exchange' });
    throw new Error('token_exchange_failed');
  }

  return body;
}

/**
 * Consomme le state et retourne tenant_id, ou null si invalide / expiré.
 */
async function consumeState(state: string): Promise<string | null> {
  const db = getDatabase();
  const result = await db.query<{ tenant_id: string }>(
    `DELETE FROM square_oauth_states
     WHERE state_token = $1 AND expires_at > NOW()
     RETURNING tenant_id`,
    [state]
  );
  return result.rows[0]?.tenant_id ?? null;
}

async function persistSquareTokens(
  tenantId: string,
  tokens: { access_token: string; refresh_token?: string; expires_at?: string; merchant_id: string }
): Promise<void> {
  const db = getDatabase();
  const accessEnc = encryptUtf8(tokens.access_token);
  const refreshEnc = tokens.refresh_token ? encryptUtf8(tokens.refresh_token) : null;
  let expiresAt: string | null = null;
  if (tokens.expires_at) {
    const d = new Date(tokens.expires_at);
    if (!Number.isNaN(d.getTime())) expiresAt = d.toISOString();
  }

  const update = await db.query(
    `UPDATE tenant_pos_config
     SET pos_type = 'square',
         square_merchant_id = $2,
         square_access_token_encrypted = $3,
         square_refresh_token_encrypted = $4,
         square_token_expires_at = $5,
         updated_at = NOW()
     WHERE tenant_id = $1`,
    [tenantId, tokens.merchant_id, accessEnc, refreshEnc, expiresAt]
  );

  if (update.rowCount && update.rowCount > 0) {
    return;
  }

  const webhookSecret = crypto.randomBytes(32).toString('hex');
  await db.query(
    `INSERT INTO tenant_pos_config (
       tenant_id, pos_type, webhook_secret, is_active,
       square_merchant_id, square_access_token_encrypted, square_refresh_token_encrypted, square_token_expires_at
     )
     VALUES ($1, 'square', $2, true, $3, $4, $5, $6)
     ON CONFLICT (tenant_id) DO UPDATE SET
       pos_type = 'square',
       square_merchant_id = EXCLUDED.square_merchant_id,
       square_access_token_encrypted = EXCLUDED.square_access_token_encrypted,
       square_refresh_token_encrypted = EXCLUDED.square_refresh_token_encrypted,
       square_token_expires_at = EXCLUDED.square_token_expires_at,
       updated_at = NOW()`,
    [tenantId, webhookSecret, tokens.merchant_id, accessEnc, refreshEnc, expiresAt]
  );
}

/**
 * Callback OAuth Square (sans JWT). Retourne l’URL de redirection frontend (succès ou erreur générique).
 */
export async function handleSquareOAuthCallback(
  code: string | undefined,
  state: string | undefined,
  oauthError: string | undefined
): Promise<string> {
  if (oauthError) {
    return frontendRedirect('error');
  }
  if (!code || !state) {
    return frontendRedirect('error');
  }

  const tenantId = await consumeState(state);
  if (!tenantId) {
    return frontendRedirect('error');
  }

  if (!isSquareOAuthConfigured()) {
    return frontendRedirect('error');
  }

  try {
    const tokens = await exchangeAuthorizationCode(code);
    await persistSquareTokens(tenantId, {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      merchant_id: tokens.merchant_id!,
    });
    return frontendRedirect('connected');
  } catch {
    return frontendRedirect('error');
  }
}
