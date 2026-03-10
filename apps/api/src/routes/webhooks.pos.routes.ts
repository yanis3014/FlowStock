/**
 * POS Webhook route (Story 2.1, 2.3, 2.4)
 * POST /webhooks/pos — receives sale events (generic payload).
 * POST /webhooks/pos/lightspeed — Lightspeed (Story 2.3).
 * POST /webhooks/pos/laddition — L'Addition (Story 2.4).
 * POST /webhooks/pos/square — Square (Story 2.4).
 * Authenticated via X-Tenant-Id + Authorization: Bearer <webhook_secret>.
 * No CSRF (external systems); mount before CSRF middleware.
 */
import { Router, Request, Response } from 'express';
import {
  getConfigByTenantAndSecret,
  validatePayload,
  recordEventIdempotent,
  logWebhookError,
  verifySquareSignature,
} from '../services/pos-webhook.service';
import { processPosSaleEvent } from '../services/pos-sale-decrement.service';
import { recordWebhookSuccess, recordWebhookFailure } from '../services/pos-sync-status.service';
import { parseLightspeedPayload, transformToInternalPayload } from '../services/pos-adapters/lightspeed.adapter';
import { parseLadditionPayload, transformToInternalPayload as transformLadditionToInternal } from '../services/pos-adapters/laddition.adapter';
import { parseSquarePayload, transformToInternalPayload as transformSquareToInternal } from '../services/pos-adapters/square.adapter';
import { isValidUuid } from '../utils/validation';

const router = Router();

/** Request with optional raw body (set by middleware for POST /webhooks/pos/square) */
type RequestWithRawBody = Request & { rawBody?: Buffer };

function getBearerSecret(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

function sendSuccessResponse(res: Response, decrementResult: { processed_lines: unknown[]; unmapped_lines: unknown[]; errors: unknown[] }) {
  res.status(200).json({
    received: true,
    processed_lines: decrementResult.processed_lines.length,
    unmapped_lines: decrementResult.unmapped_lines.length,
    errors: decrementResult.errors.length,
    details:
      decrementResult.unmapped_lines.length > 0 || decrementResult.errors.length > 0
        ? { unmapped: decrementResult.unmapped_lines, insufficient_stock: decrementResult.errors }
        : undefined,
  });
}

type DedicatedPosOptions<T> = {
  posType: string;
  unwrapFormPayload: boolean;
  parsePayload: (rawBody: unknown) => T | null;
  transformToInternal: (tenantId: string, parsed: T) => Promise<import('../services/pos-webhook.service').PosWebhookPayload>;
  getExternalIdForLog: (req: Request, parsed: T | null) => string | null;
  invalidPayloadError: string;
  posTypeLabel: string;
  verifySignature?: (req: RequestWithRawBody, config: import('../services/pos-webhook.service').TenantPosConfigRow) => boolean;
};

async function handleDedicatedPosWebhook<T>(req: Request, res: Response, options: DedicatedPosOptions<T>): Promise<void> {
  const body = req.body as Record<string, unknown> | null | undefined;
  const tenantIdFromHeader = typeof req.headers['x-tenant-id'] === 'string' ? req.headers['x-tenant-id'].trim() : null;
  const tenantIdFromBody = body != null && typeof body.tenant_id === 'string' ? body.tenant_id.trim() : null;
  const tenantId: string | null = tenantIdFromHeader || tenantIdFromBody;
  const secret = getBearerSecret(req);

  if (!tenantId || !secret) {
    logWebhookError(401, tenantId ?? null, null, 'auth_missing', 'X-Tenant-Id and Authorization Bearer required');
    res.status(401).json({ success: false, error: 'X-Tenant-Id and Authorization: Bearer required' });
    return;
  }
  if (!isValidUuid(tenantId)) {
    logWebhookError(400, null, null, 'invalid_tenant_id', 'X-Tenant-Id must be a valid UUID');
    res.status(400).json({ success: false, error: 'X-Tenant-Id must be a valid UUID' });
    return;
  }

  try {
    const config = await getConfigByTenantAndSecret(tenantId, secret);
    if (!config) {
      void recordWebhookFailure(tenantId).catch(() => {});
      logWebhookError(403, tenantId, null, 'invalid_tenant_or_secret', 'Tenant not found or invalid webhook secret');
      res.status(403).json({ success: false, error: 'Invalid tenant or webhook secret' });
      return;
    }
    if (config.pos_type !== options.posType) {
      void recordWebhookFailure(tenantId).catch(() => {});
      logWebhookError(403, tenantId, null, 'invalid_pos_type', `POS config must be ${options.posTypeLabel} for this endpoint`);
      res.status(403).json({ success: false, error: `POS config must be ${options.posTypeLabel} for this endpoint` });
      return;
    }

    if (options.verifySignature && !options.verifySignature(req as RequestWithRawBody, config)) {
      void recordWebhookFailure(tenantId).catch(() => {});
      logWebhookError(401, tenantId, null, 'square_signature_invalid', 'Square signature verification failed');
      res.status(401).json({ success: false, error: 'Invalid Square signature' });
      return;
    }

    let rawBody: unknown = req.body;
    if (options.unwrapFormPayload && body != null && typeof body.payload === 'string') {
      try {
        rawBody = JSON.parse(body.payload) as Record<string, unknown>;
      } catch {
        void recordWebhookFailure(tenantId).catch(() => {});
        logWebhookError(400, tenantId, null, 'payload_parse', 'payload field must be valid JSON');
        res.status(400).json({ success: false, error: 'Invalid payload JSON' });
        return;
      }
    }

    const parsed = options.parsePayload(rawBody);
    if (!parsed) {
      void recordWebhookFailure(tenantId).catch(() => {});
      logWebhookError(400, tenantId, null, `${options.posType}_parse`, options.invalidPayloadError);
      res.status(400).json({ success: false, error: options.invalidPayloadError });
      return;
    }

    const payload = await options.transformToInternal(tenantId, parsed);
    const idem = await recordEventIdempotent(tenantId, payload.external_id);
    if (idem === 'duplicate') {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    const decrementResult = await processPosSaleEvent(tenantId, payload);
    await recordWebhookSuccess(tenantId);
    sendSuccessResponse(res, decrementResult);
  } catch (err) {
    if (tenantId) void recordWebhookFailure(tenantId).catch(() => {});
    const externalId = options.getExternalIdForLog(req, null);
    const message = err instanceof Error ? err.message : 'Internal server error';
    logWebhookError(500, tenantId, externalId, 'server_error', message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

router.post('/', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown> | null | undefined;
  const tenantIdFromHeader =
    typeof req.headers['x-tenant-id'] === 'string' ? req.headers['x-tenant-id'].trim() : null;
  const tenantIdFromBody =
    body != null && typeof body.tenant_id === 'string' ? body.tenant_id.trim() : null;
  const tenantId: string | null = tenantIdFromHeader || tenantIdFromBody;
  const secret = getBearerSecret(req);

  if (!tenantId || !secret) {
    logWebhookError(401, tenantId ?? null, null, 'auth_missing', 'X-Tenant-Id and Authorization Bearer required');
    res.status(401).json({ success: false, error: 'X-Tenant-Id and Authorization: Bearer required' });
    return;
  }

  if (!isValidUuid(tenantId)) {
    logWebhookError(400, null, null, 'invalid_tenant_id', 'X-Tenant-Id must be a valid UUID');
    res.status(400).json({ success: false, error: 'X-Tenant-Id must be a valid UUID' });
    return;
  }

  try {
    const config = await getConfigByTenantAndSecret(tenantId, secret);
    if (!config) {
      void recordWebhookFailure(tenantId).catch(() => {});
      logWebhookError(403, tenantId, null, 'invalid_tenant_or_secret', 'Tenant not found or invalid webhook secret');
      res.status(403).json({ success: false, error: 'Invalid tenant or webhook secret' });
      return;
    }

    const validation = validatePayload(req.body);
    if (!validation.ok) {
      void recordWebhookFailure(tenantId).catch(() => {});
      logWebhookError(400, tenantId, null, 'payload_validation', validation.error);
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    const { payload } = validation;
    const idem = await recordEventIdempotent(tenantId, payload.external_id);
    if (idem === 'duplicate') {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    const decrementResult = await processPosSaleEvent(tenantId, payload);
    await recordWebhookSuccess(tenantId);
    // Always return 200 with detailed body (processed_lines, unmapped_lines, errors)
    // to prevent unnecessary POS retries on partial failures. The POS system should
    // inspect the body to determine if lines were processed.
    res.status(200).json({
      received: true,
      processed_lines: decrementResult.processed_lines.length,
      unmapped_lines: decrementResult.unmapped_lines.length,
      errors: decrementResult.errors.length,
      details:
        decrementResult.unmapped_lines.length > 0 || decrementResult.errors.length > 0
          ? {
              unmapped: decrementResult.unmapped_lines,
              insufficient_stock: decrementResult.errors,
            }
          : undefined,
    });
  } catch (err) {
    void recordWebhookFailure(tenantId).catch(() => {});
    const body = req.body as Record<string, unknown> | null | undefined;
    const externalId: string | null =
      body != null && typeof body.external_id === 'string' ? body.external_id : null;
    const message = err instanceof Error ? err.message : 'Internal server error';
    logWebhookError(500, tenantId, externalId, 'server_error', message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /webhooks/pos/lightspeed (Story 2.3)
 * Receives Lightspeed X-Series webhook (sale:complete / sale:update).
 * Body: JSON or application/x-www-form-urlencoded with "payload" (JSON string).
 * Same auth as generic webhook; config must have pos_type=lightspeed.
 */
router.post('/lightspeed', (req: Request, res: Response) =>
  handleDedicatedPosWebhook(req, res, {
    posType: 'lightspeed',
    posTypeLabel: 'Lightspeed',
    unwrapFormPayload: true,
    parsePayload: parseLightspeedPayload,
    transformToInternal: transformToInternalPayload,
    getExternalIdForLog: (req, parsed) => parsed?.saleId ?? (req.body && typeof (req.body as Record<string, unknown>).saleID === 'string' ? (req.body as Record<string, unknown>).saleID as string : null) ?? null,
    invalidPayloadError: 'Invalid or empty Lightspeed payload (saleId and lineItems required)',
  })
);

/**
 * POST /webhooks/pos/laddition (Story 2.4)
 * Receives L'Addition webhook. Body: JSON or form with optional "payload" (JSON).
 * Auth: X-Tenant-Id + Bearer; tenant_pos_config pos_type=laddition.
 */
router.post('/laddition', (req: Request, res: Response) =>
  handleDedicatedPosWebhook(req, res, {
    posType: 'laddition',
    posTypeLabel: "L'Addition",
    unwrapFormPayload: true,
    parsePayload: parseLadditionPayload,
    transformToInternal: transformLadditionToInternal,
    getExternalIdForLog: (req, parsed) => parsed?.saleId ?? (req.body && typeof (req.body as Record<string, unknown>).sale_id === 'string' ? (req.body as Record<string, unknown>).sale_id as string : null) ?? null,
    invalidPayloadError: "Invalid or empty L'Addition payload",
  })
);

/**
 * POST /webhooks/pos/square (Story 2.4)
 * Receives Square Orders API webhook (order.created / order.updated). Body: JSON.
 * Auth: X-Tenant-Id + Bearer; tenant_pos_config pos_type=square.
 * When square_signature_key and square_notification_url are set, verifies x-square-hmacsha256-signature (H1).
 */
router.post('/square', (req: Request, res: Response) =>
  handleDedicatedPosWebhook(req, res, {
    posType: 'square',
    posTypeLabel: 'Square',
    unwrapFormPayload: false,
    parsePayload: parseSquarePayload,
    transformToInternal: transformSquareToInternal,
    getExternalIdForLog: (req, parsed) => parsed?.orderId ?? (req.body && typeof (req.body as Record<string, unknown>).event_id === 'string' ? (req.body as Record<string, unknown>).event_id as string : null) ?? null,
    invalidPayloadError: 'Invalid or empty Square payload',
    verifySignature: (reqWithRaw, config) => {
      const raw = reqWithRaw.rawBody;
      const key = config.square_signature_key;
      const url = config.square_notification_url;
      if (!raw || !key?.trim() || !url?.trim()) return true; // skip verification when not configured
      const sig = reqWithRaw.headers['x-square-hmacsha256-signature'];
      return verifySquareSignature(raw, typeof sig === 'string' ? sig : undefined, key, url);
    },
  })
);

export default router;
