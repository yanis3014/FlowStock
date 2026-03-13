'use server';

import type { CsvTransformResult, CsvMapping } from '@/types/csv-import';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const SYSTEM_PROMPT = `Tu es un assistant expert en transformation de données CSV.
Ton rôle est d'analyser un fichier CSV source dont les colonnes sont inconnues
et de le transformer vers un format cible précis.
Tu réponds toujours avec un JSON valide correspondant exactement au schéma demandé.`;

const TARGET_DESCRIPTIONS = `Colonnes : sku, name, description, unit, quantity, min_quantity, location_name,
supplier_name, purchase_price, selling_price, lead_time_days

Descriptions :
- sku : identifiant unique produit (string, obligatoire)
- name : nom du produit (string, obligatoire)
- description : description libre (string, optionnel)
- unit : unité de mesure ex. kg, litre, pièce, bouteille (string, optionnel)
- quantity : quantité en stock, nombre positif (number, optionnel)
- min_quantity : seuil minimum de stock avant alerte, nombre positif (number, optionnel)
- location_name : nom de l'emplacement de stockage (string, optionnel)
- supplier_name : nom du fournisseur (string, optionnel)
- purchase_price : prix d'achat unitaire, nombre positif (number, optionnel)
- selling_price : prix de vente unitaire, nombre positif (number, optionnel)
- lead_time_days : délai de réapprovisionnement en jours, entier positif (number, optionnel)`;

/** Détecte le séparateur (virgule ou point-virgule) à partir de la première ligne */
function detectDelimiter(firstLine: string): string {
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

/**
 * Parse CSV simple : trim BOM, split lignes, split par délimiteur.
 * Ne gère pas les guillemets avec délimiteur à l'intérieur.
 */
function parseCsvSimple(rawCsv: string): { headers: string[]; rows: string[][] } {
  const text = rawCsv.replace(/^\uFEFF/, '').trim();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    rows.push(lines[i].split(delimiter).map((c) => c.trim()));
  }
  return { headers, rows };
}

/** Applique le mapping aux lignes brutes pour produire les lignes cibles */
function applyMapping(
  headers: string[],
  rows: string[][],
  mapping: CsvMapping[]
): Record<string, string>[] {
  const sourceToTarget = new Map(mapping.filter((m) => m.target).map((m) => [m.source, m.target]));
  return rows.map((row) => {
    const out: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const target = sourceToTarget.get(h);
      if (target) {
        const val = row[idx] ?? '';
        out[target] = val.replace(/,/g, '.').replace(/\s/g, ' ').trim();
      }
    });
    return out;
  });
}

/** Construit le prompt utilisateur pour OpenAI */
function buildUserPrompt(
  headers: string[],
  sampleRows: Record<string, string>[],
  rawCsvContent: string,
  fullTransform: boolean
): string {
  const headersJson = JSON.stringify(headers);
  const sampleJson = JSON.stringify(sampleRows);
  const instructions = fullTransform
    ? `4. Transforme TOUTES les lignes du CSV source (pas seulement l'échantillon).
5. Retourne dans "rows" toutes les lignes transformées (clés = colonnes cibles).`
    : `4. Détermine uniquement le mapping (source → cible). Ne renvoie pas les lignes transformées : "rows" doit être un tableau vide [].
5. Le champ "totalRows" doit indiquer le nombre total de lignes dans le CSV.`;

  return `## Format cible
${TARGET_DESCRIPTIONS}

## Fichier source
Colonnes détectées : ${headersJson}
Exemples de données (10 premières lignes) : ${sampleJson}

## Instructions
1. Analyse la sémantique de chaque colonne source (nom + valeurs d'exemple).
2. Détermine le meilleur mapping vers les colonnes cibles.
3. Pour chaque mapping, indique un niveau de confiance : "high" si évident, "medium" si probable, "low" si incertain.
${instructions}
6. Si une colonne source ne correspond à aucune colonne cible, liste-la dans unmappedSourceColumns.
7. Si sku ou name n'ont pas pu être mappés, liste-les dans missingRequiredColumns.
8. Nettoie les données : trim sur toutes les valeurs, convertis les nombres (supprime symboles monétaires, remplace virgules décimales par des points).

## Schéma JSON de réponse attendu
{
  "mapping": [
    { "source": "nom_colonne_source", "target": "nom_colonne_cible", "confidence": "high" }
  ],
  "rows": [
    { "sku": "...", "name": "...", "quantity": "10", ... }
  ],
  "unmappedSourceColumns": [],
  "missingRequiredColumns": [],
  "note": "Explication courte en français du mapping effectué.",
  "totalRows": 42
}

## Données complètes à transformer
\`\`\`
${rawCsvContent}
\`\`\``;
}

/** Appel API OpenAI */
async function callOpenAI(userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY est absent. Configurez-la dans .env.local pour utiliser l\'analyse IA.');
  }

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      max_tokens: 4096,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Réponse OpenAI vide');
  return content;
}

/** Parse la réponse JSON, avec retry si markdown présent */
function parseJsonResponse(content: string): CsvTransformResult {
  let cleaned = content.trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];
  try {
    return JSON.parse(cleaned) as CsvTransformResult;
  } catch {
    throw new Error('La réponse de l\'IA n\'est pas un JSON valide. Réessayez.');
  }
}

export type TransformCsvResult =
  | { success: true; data: CsvTransformResult }
  | { success: false; error: string };

/**
 * Server Action : analyse le CSV avec l'IA et retourne le mapping + données transformées.
 * Retourne { success, data? | error? } pour que le message d'erreur soit toujours visible en production.
 */
export async function transformCsvWithAI(rawCsv: string): Promise<TransformCsvResult> {
  try {
    const { headers, rows } = parseCsvSimple(rawCsv);
    if (headers.length === 0) {
      return { success: false, error: 'Aucune colonne détectée dans le fichier CSV.' };
    }

  const totalRows = rows.length;
  const sampleSize = totalRows > 500 ? 20 : Math.min(10, totalRows);
  const sampleRowsRaw = rows.slice(0, sampleSize);
  const sampleRows: Record<string, string>[] = sampleRowsRaw.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    return obj;
  });

  const rawForPrompt = totalRows > 500 ? rawCsv.split(/\r?\n/).slice(0, 21).join('\n') : rawCsv;
  const fullTransform = totalRows <= 500;
  const userPrompt = buildUserPrompt(headers, sampleRows.slice(0, 10), rawForPrompt, fullTransform);

    let result: CsvTransformResult;
    try {
      const content = await callOpenAI(userPrompt);
      result = parseJsonResponse(content);
    } catch (e) {
      if (e instanceof Error && e.message.includes('JSON')) {
        try {
          const contentRetry = await callOpenAI(userPrompt + '\n\nRéponds UNIQUEMENT avec le JSON, sans aucun texte avant ou après.');
          result = parseJsonResponse(contentRetry);
        } catch (err2) {
          return { success: false, error: e instanceof Error ? e.message : 'Réponse IA invalide.' };
        }
      } else {
        return { success: false, error: e instanceof Error ? e.message : 'Erreur lors de l\'analyse IA.' };
      }
    }

  if (!result.mapping || !Array.isArray(result.mapping)) {
    result.mapping = [];
  }
  if (!result.rows || !Array.isArray(result.rows)) {
    result.rows = [];
  }
  if (!result.unmappedSourceColumns || !Array.isArray(result.unmappedSourceColumns)) {
    result.unmappedSourceColumns = [];
  }
  if (!result.missingRequiredColumns || !Array.isArray(result.missingRequiredColumns)) {
    result.missingRequiredColumns = [];
  }

  const hasSku = result.mapping.some((m) => m.target === 'sku');
  const hasName = result.mapping.some((m) => m.target === 'name');
  if (!hasSku) result.missingRequiredColumns.push('sku');
  if (!hasName) result.missingRequiredColumns.push('name');

  result.totalRows = totalRows;

  if (totalRows > 500) {
    const transformed = applyMapping(headers, rows, result.mapping);
    result.rows = transformed.slice(0, 10);
  } else if (result.rows.length === 0 && result.mapping.length > 0) {
    const transformed = applyMapping(headers, rows, result.mapping);
    result.rows = transformed.slice(0, 10);
  } else {
    result.rows = result.rows.slice(0, 10);
  }

    return { success: true, data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inattendue lors de l\'analyse.';
    return { success: false, error: message };
  }
}
