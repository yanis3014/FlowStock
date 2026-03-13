/**
 * Invoice Service — Epic 7 : Upload facture fournisseur & OCR
 * Handles file storage, GPT-4o OCR extraction, product matching, and stock integration.
 */
import { getDatabase } from '../database/connection';
import { logMovement } from './stockMovement.service';
import type {
  InvoiceLine,
  InvoiceOcrResult,
  InvoiceConfidence,
  ValidateInvoiceResult,
} from '@bmad/shared';

import { OPENAI_URL, getOpenAIKey } from '../lib/openai';

const OCR_SYSTEM_PROMPT = `Tu es un assistant expert en lecture de factures fournisseurs de restaurant.
Extrais TOUTES les lignes produits de cette facture.
Réponds UNIQUEMENT en JSON valide, sans texte avant ou après.`;

const OCR_USER_PROMPT = `Extrais TOUTES les lignes produits de cette facture fournisseur.
Réponds UNIQUEMENT en JSON valide avec exactement ce schéma :
{
  "fournisseur": "nom du fournisseur si visible ou null",
  "date_facture": "YYYY-MM-DD si visible ou null",
  "lignes": [
    {
      "designation": "nom du produit tel qu'écrit sur la facture",
      "quantite": 10,
      "unite": "kg",
      "prix_unitaire_ht": 5.50,
      "montant_ht": 55.00
    }
  ],
  "total_ht": 55.00,
  "confiance": "high"
}
Le champ "confiance" doit être "high" si la facture est claire, "medium" si partiellement lisible, "low" si la lecture est difficile.`;

const MATCHING_SYSTEM_PROMPT = `Tu es un assistant expert en gestion de stocks de restaurant.
Tu dois faire correspondre des désignations de lignes de facture avec des produits d'un catalogue.
Réponds UNIQUEMENT en JSON valide.`;

function buildMatchingPrompt(invoiceLines: InvoiceLine[], products: Array<{ id: string; name: string; sku: string; unit: string }>): string {
  return `## Lignes de facture à matcher
${JSON.stringify(invoiceLines.map((l, i) => ({ index: i, designation: l.designation, quantite: l.quantite, unite: l.unite })))}

## Catalogue produits disponibles
${JSON.stringify(products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, unit: p.unit })))}

## Instructions
Pour chaque ligne de facture, trouve le produit du catalogue qui correspond le mieux (correspondance sémantique).
Si aucun produit ne correspond, laisse product_id à null.

Réponds en JSON :
{
  "matches": [
    { "index": 0, "product_id": "uuid-ou-null", "confidence": "high|medium|low" }
  ]
}`;
}


async function callOpenAiOcr(base64Data: string, mimeType: string): Promise<string> {
  const apiKey = getOpenAIKey();

  const isImage = mimeType.startsWith('image/');
  const contentParts: unknown[] = [];

  if (isImage) {
    contentParts.push({
      type: 'image_url',
      image_url: { url: `data:${mimeType};base64,${base64Data}`, detail: 'high' },
    });
  } else {
    // PDF: use file attachment format
    contentParts.push({
      type: 'file',
      file: {
        filename: 'facture.pdf',
        file_data: `data:application/pdf;base64,${base64Data}`,
      },
    });
  }
  contentParts.push({ type: 'text', text: OCR_USER_PROMPT });

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: OCR_SYSTEM_PROMPT },
        { role: 'user', content: contentParts },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Réponse OpenAI vide');
  return content;
}

function parseOcrResponse(content: string): {
  fournisseur: string | null;
  date_facture: string | null;
  lignes: InvoiceLine[];
  total_ht: number | null;
  confiance: InvoiceConfidence;
} {
  let cleaned = content.trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];

  const parsed = JSON.parse(cleaned) as {
    fournisseur?: string;
    date_facture?: string;
    lignes?: Array<{
      designation?: string;
      quantite?: number | string;
      unite?: string;
      prix_unitaire_ht?: number | string;
      montant_ht?: number | string;
    }>;
    total_ht?: number | string;
    confiance?: string;
  };

  const lignes: InvoiceLine[] = (parsed.lignes || []).map((l) => ({
    designation: String(l.designation || '').trim(),
    quantite: parseFloat(String(l.quantite ?? 0).replace(',', '.')) || 0,
    unite: l.unite ? String(l.unite).trim() : null,
    prix_unitaire_ht: l.prix_unitaire_ht != null ? parseFloat(String(l.prix_unitaire_ht).replace(',', '.')) || null : null,
    montant_ht: l.montant_ht != null ? parseFloat(String(l.montant_ht).replace(',', '.')) || null : null,
  }));

  const totalHt = parsed.total_ht != null ? parseFloat(String(parsed.total_ht).replace(',', '.')) || null : null;
  const rawConf = String(parsed.confiance || '').toLowerCase();
  const confiance: InvoiceConfidence = rawConf === 'high' ? 'high' : rawConf === 'medium' ? 'medium' : 'low';

  return {
    fournisseur: parsed.fournisseur ? String(parsed.fournisseur).trim() : null,
    date_facture: parsed.date_facture ? String(parsed.date_facture).trim() : null,
    lignes,
    total_ht: totalHt,
    confiance,
  };
}

async function resolveSupplierByName(tenantId: string, supplierName: string | null): Promise<string | null> {
  if (!supplierName?.trim()) return null;
  const db = getDatabase();
  const r = await db.queryWithTenant<{ id: string }>(
    tenantId,
    `SELECT id FROM suppliers WHERE tenant_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) AND is_active = true LIMIT 1`,
    [tenantId, supplierName.trim()]
  );
  return r.rows[0]?.id ?? null;
}

/**
 * Upload a file, run GPT-4o OCR, and store invoice in DB.
 * Returns the invoice_id and OCR result.
 */
export async function uploadAndExtractOCR(
  tenantId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<InvoiceOcrResult> {
  const base64Data = fileBuffer.toString('base64');

  let ocrData: ReturnType<typeof parseOcrResponse>;
  let ocrRaw: string | null = null;

  try {
    const content = await callOpenAiOcr(base64Data, mimeType);
    ocrRaw = content;
    ocrData = parseOcrResponse(content);
  } catch (_err) {
    // OCR failed → store invoice with erreur status, return low confidence with empty lines
    const db = getDatabase();
    const insertRes = await db.queryWithTenant<{ id: string }>(
      tenantId,
      `INSERT INTO invoices (tenant_id, file_name, file_data, file_mime, confidence, status)
       VALUES ($1, $2, $3, $4, 'low', 'erreur')
       RETURNING id`,
      [tenantId, fileName, base64Data, mimeType]
    );
    const invoiceId = insertRes.rows[0]?.id;
    if (!invoiceId) throw new Error('Erreur lors de la création de la facture');

    return {
      invoice_id: invoiceId,
      fournisseur: null,
      date_facture: null,
      lignes: [],
      total_ht: null,
      confiance: 'low',
    };
  }

  const supplierId = await resolveSupplierByName(tenantId, ocrData.fournisseur);
  const db = getDatabase();

  const insertRes = await db.queryWithTenant<{ id: string }>(
    tenantId,
    `INSERT INTO invoices (tenant_id, supplier_id, supplier_name, invoice_date, file_name, file_data, file_mime, total_ht, confidence, status, ocr_raw)
     VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, 'reviewing', $10)
     RETURNING id`,
    [
      tenantId,
      supplierId,
      ocrData.fournisseur,
      ocrData.date_facture || null,
      fileName,
      base64Data,
      mimeType,
      ocrData.total_ht,
      ocrData.confiance,
      ocrRaw,
    ]
  );
  const invoiceId = insertRes.rows[0]?.id;
  if (!invoiceId) throw new Error('Erreur lors de la création de la facture');

  return {
    invoice_id: invoiceId,
    fournisseur: ocrData.fournisseur,
    date_facture: ocrData.date_facture,
    lignes: ocrData.lignes,
    total_ht: ocrData.total_ht,
    confiance: ocrData.confiance,
  };
}

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: string;
}

async function matchLinesWithAI(
  invoiceLines: InvoiceLine[],
  products: ProductRow[]
): Promise<Array<{ index: number; product_id: string | null; confidence: string }>> {
  if (invoiceLines.length === 0 || products.length === 0) {
    return invoiceLines.map((_, i) => ({ index: i, product_id: null, confidence: 'low' }));
  }

  const apiKey = getOpenAIKey();
  const prompt = buildMatchingPrompt(invoiceLines, products);

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: MATCHING_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    return invoiceLines.map((_, i) => ({ index: i, product_id: null, confidence: 'low' }));
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return invoiceLines.map((_, i) => ({ index: i, product_id: null, confidence: 'low' }));

  try {
    let cleaned = content.trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) cleaned = m[0];
    const parsed = JSON.parse(cleaned) as {
      matches?: Array<{ index: number; product_id: string | null; confidence?: string }>;
    };
    return (parsed.matches || []).map((match) => ({
      index: match.index,
      product_id: match.product_id || null,
      confidence: match.confidence || 'medium',
    }));
  } catch {
    return invoiceLines.map((_, i) => ({ index: i, product_id: null, confidence: 'low' }));
  }
}

/**
 * Validate invoice lines, match products, update stocks, create movements.
 */
export async function validateInvoice(
  tenantId: string,
  invoiceId: string,
  lines: InvoiceLine[],
  supplierName: string | null,
  invoiceDate: string | null,
  userId: string | null
): Promise<ValidateInvoiceResult> {
  const db = getDatabase();

  // Verify invoice belongs to tenant
  const invoiceCheck = await db.queryWithTenant<{ id: string }>(
    tenantId,
    `SELECT id FROM invoices WHERE tenant_id = $1 AND id = $2`,
    [tenantId, invoiceId]
  );
  if (!invoiceCheck.rows[0]) throw new Error('Facture introuvable');

  // Load all active products for matching
  const productsResult = await db.queryWithTenant<ProductRow>(
    tenantId,
    `SELECT id, name, sku, unit, quantity::text AS quantity FROM products WHERE tenant_id = $1 AND is_active = true`,
    [tenantId]
  );
  const products = productsResult.rows;

  // AI matching: designations → product_ids
  const matches = await matchLinesWithAI(lines, products);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const updated: ValidateInvoiceResult['updated'] = [];
  const unmatched: ValidateInvoiceResult['unmatched'] = [];

  // Resolve supplier_id for update
  const supplierId = await resolveSupplierByName(tenantId, supplierName);

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matchInfo = matches.find((m) => m.index === i);
    const productId = line.product_id || matchInfo?.product_id || null;

    if (!productId || !productMap.has(productId)) {
      if (line.designation?.trim()) {
        unmatched.push({ designation: line.designation, quantite: line.quantite });
      }
      continue;
    }

    const product = productMap.get(productId)!;
    const qtyBefore = parseFloat(product.quantity) || 0;
    const qtyAfter = qtyBefore + (line.quantite || 0);

    // Update product quantity
    await db.queryWithTenant(
      tenantId,
      `UPDATE products SET quantity = $2, updated_at = NOW() WHERE tenant_id = $1 AND id = $3`,
      [tenantId, qtyAfter, productId]
    );

    // Log stock movement
    await logMovement(
      tenantId,
      productId,
      'entree_livraison',
      qtyBefore,
      qtyAfter,
      userId,
      `Livraison facture${supplierName ? ` - ${supplierName}` : ''}`
    );

    // Insert invoice_line record
    await db.queryWithTenant(
      tenantId,
      `INSERT INTO invoice_lines (invoice_id, tenant_id, designation, quantite, unite, prix_unitaire_ht, montant_ht, product_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [invoiceId, tenantId, line.designation, line.quantite, line.unite, line.prix_unitaire_ht, line.montant_ht, productId]
    );

    updated.push({ product_id: productId, product_name: product.name, qty_added: line.quantite || 0 });
  }

  // Insert unmatched lines too (for traceability)
  for (const u of unmatched) {
    await db.queryWithTenant(
      tenantId,
      `INSERT INTO invoice_lines (invoice_id, tenant_id, designation, quantite)
       VALUES ($1, $2, $3, $4)`,
      [invoiceId, tenantId, u.designation, u.quantite]
    );
  }

  // Mark invoice as processed
  await db.queryWithTenant(
    tenantId,
    `UPDATE invoices SET status = 'traitee', supplier_id = COALESCE($2, supplier_id),
     supplier_name = COALESCE($3, supplier_name), invoice_date = COALESCE($4::date, invoice_date),
     updated_at = NOW()
     WHERE tenant_id = $1 AND id = $5`,
    [tenantId, supplierId, supplierName, invoiceDate || null, invoiceId]
  );

  return { updated, unmatched };
}

/**
 * List invoices for a tenant with pagination.
 */
export async function listInvoices(
  tenantId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: Array<{ id: string; supplier_name: string | null; invoice_date: string | null; status: string; confidence: string | null; file_name: string | null; created_at: string }>; total: number }> {
  const db = getDatabase();
  const offset = (page - 1) * limit;

  const countRes = await db.queryWithTenant<{ count: string }>(
    tenantId,
    `SELECT COUNT(*)::text AS count FROM invoices WHERE tenant_id = $1`,
    [tenantId]
  );
  const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

  const listRes = await db.queryWithTenant<{
    id: string;
    supplier_name: string | null;
    invoice_date: Date | null;
    status: string;
    confidence: string | null;
    file_name: string | null;
    created_at: Date;
  }>(
    tenantId,
    `SELECT id, supplier_name, invoice_date, status, confidence, file_name, created_at
     FROM invoices WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset]
  );

  return {
    data: listRes.rows.map((r) => ({
      id: r.id,
      supplier_name: r.supplier_name,
      invoice_date: r.invoice_date ? r.invoice_date.toISOString().split('T')[0] : null,
      status: r.status,
      confidence: r.confidence,
      file_name: r.file_name,
      created_at: r.created_at.toISOString(),
    })),
    total,
  };
}
