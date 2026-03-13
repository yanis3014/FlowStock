import { getDatabase } from '../database/connection';
import { getSalesSummary } from './sales.service';
import { listProducts, getProductById } from './product.service';
import {
  validateFormulaSyntax,
  extractVariables,
  evaluateExpression,
  AppError,
} from './custom-formula-engine';

export interface Formula {
  id: string;
  name: string;
  description: string | null;
  formula_expression: string;
  variables_used: string[];
  formula_type: 'predefined' | 'custom';
  is_active: boolean;
  created_by_user_id?: string | null;
  created_at?: string | null;
}

export interface FormulaCreateInput {
  name: string;
  description?: string;
  formula_expression: string;
}

export interface FormulaUpdateInput {
  name?: string;
  description?: string;
  formula_expression?: string;
}

export interface FormulaExecuteParams {
  product_id?: string;
  period_days?: number;
  date_from?: string;
  date_to?: string;
  scope?: 'product' | 'all';
}

export interface FormulaExecuteResult {
  result: number | Record<string, number | null> | null;
  unit?: string;
  formula_name?: string;
  /** Products where evaluation failed (product name → error message) */
  errors?: Record<string, string>;
}

interface FormulaRow {
  id: string;
  name: string;
  description: string | null;
  formula_expression: string;
  variables_used: string[] | null;
  formula_type: string;
  is_active: boolean;
  created_by_user_id?: string | null;
  created_at?: string | null;
}

function rowToFormula(row: FormulaRow): Formula {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    formula_expression: row.formula_expression,
    variables_used: row.variables_used ?? [],
    formula_type: row.formula_type as 'predefined' | 'custom',
    is_active: row.is_active,
    created_by_user_id: row.created_by_user_id ?? null,
    created_at: row.created_at ?? null,
  };
}

/**
 * List all predefined formulas (tenant_id NULL, visible to all tenants)
 */
export async function listPredefinedFormulas(tenantId: string): Promise<Formula[]> {
  const db = getDatabase();
  const result = await db.queryWithTenant<FormulaRow>(
    tenantId,
    `SELECT id, name, description, formula_expression, variables_used, formula_type, is_active
     FROM formulas
     WHERE formula_type = 'predefined' AND tenant_id IS NULL AND is_active = true
     ORDER BY name`
  );
  return result.rows.map(rowToFormula);
}

/**
 * Get a single predefined formula by id
 */
export async function getPredefinedFormulaById(
  tenantId: string,
  formulaId: string
): Promise<Formula | null> {
  const db = getDatabase();
  const result = await db.queryWithTenant<FormulaRow>(
    tenantId,
    `SELECT id, name, description, formula_expression, variables_used, formula_type, is_active
     FROM formulas
     WHERE id = $1 AND formula_type = 'predefined' AND tenant_id IS NULL AND is_active = true`,
    [formulaId]
  );
  if (result.rows.length === 0) return null;
  return rowToFormula(result.rows[0]);
}

/**
 * Execute a formula (predefined or custom) with given params
 */
export async function executeFormula(
  tenantId: string,
  formulaId: string,
  params: FormulaExecuteParams = {}
): Promise<FormulaExecuteResult> {
  // Try predefined first
  let formula = await getPredefinedFormulaById(tenantId, formulaId);

  // If not predefined, try custom
  if (!formula) {
    formula = await getCustomFormulaById(tenantId, formulaId);
  }

  if (!formula) {
    throw new AppError('Formule non trouvée', 'FORMULA_NOT_FOUND');
  }

  // Custom formula — use mathjs engine
  if (formula.formula_type === 'custom') {
    return executeCustomFormula(tenantId, formula, params);
  }

  // Predefined formula — use dedicated computation functions
  const periodDays = params.period_days ?? 30;
  const scope = params.scope ?? 'all';
  const { date_from, date_to } = resolveDateRange(params, periodDays);

  switch (formula.name) {
    case 'consommation_moyenne':
      return computeConsumptionAverage(tenantId, params.product_id, date_from, date_to);
    case 'stock_securite':
      return computeSafetyStock(tenantId, params.product_id, date_from, date_to);
    case 'point_commande':
      return computeReorderPoint(tenantId, params.product_id, date_from, date_to);
    case 'taux_rotation':
      return computeTurnoverRate(tenantId, params.product_id, date_from, date_to);
    case 'jours_stock_restant':
      return computeDaysOfStockRemaining(tenantId, params.product_id, date_from, date_to);
    case 'cout_stock_moyen':
      return computeAverageCost(tenantId, scope, params.product_id);
    case 'valeur_stock':
      return computeStockValue(tenantId, scope, params.product_id);
    case 'marge_beneficiaire':
      return computeProfitMargin(tenantId, scope, params.product_id);
    default:
      throw new AppError(`Formule prédéfinie inconnue : ${formula.name}`, 'FORMULA_NOT_FOUND');
  }
}

function resolveDateRange(
  params: FormulaExecuteParams,
  periodDays: number
): { date_from: string; date_to: string } {
  if (params.date_from && params.date_to) {
    return { date_from: params.date_from, date_to: params.date_to };
  }
  const now = new Date();
  const date_to = new Date(now);
  date_to.setHours(23, 59, 59, 999);
  const date_from = new Date(date_to);
  date_from.setDate(date_from.getDate() - periodDays);
  date_from.setHours(0, 0, 0, 0);
  return {
    date_from: date_from.toISOString(),
    date_to: date_to.toISOString(),
  };
}

async function getSalesSumForPeriod(
  tenantId: string,
  productId: string | undefined,
  dateFrom: string,
  dateTo: string
): Promise<number> {
  const summary = await getSalesSummary(tenantId, {
    date_from: dateFrom,
    date_to: dateTo,
    product_id: productId,
    group_by: 'product',
  });
  const total = summary.groups.reduce((acc, g) => acc + g.quantity_sold, 0);
  return total;
}

function getDaysInPeriod(dateFrom: string, dateTo: string): number {
  const from = new Date(dateFrom).getTime();
  const to = new Date(dateTo).getTime();
  const diffMs = to - from;
  const days = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  return days;
}

async function computeConsumptionAverage(
  tenantId: string,
  productId: string | undefined,
  dateFrom: string,
  dateTo: string
): Promise<FormulaExecuteResult> {
  if (!productId) {
    throw new AppError('product_id est requis pour consommation_moyenne', 'VALIDATION');
  }
  const totalSold = await getSalesSumForPeriod(tenantId, productId, dateFrom, dateTo);
  const days = getDaysInPeriod(dateFrom, dateTo);
  const avg = days > 0 ? totalSold / days : 0;
  return { result: Math.round(avg * 1000) / 1000, unit: 'unités/jour', formula_name: 'consommation_moyenne' };
}

async function computeSafetyStock(
  tenantId: string,
  productId: string | undefined,
  dateFrom: string,
  dateTo: string
): Promise<FormulaExecuteResult> {
  if (!productId) {
    throw new AppError('product_id est requis pour stock_securite', 'VALIDATION');
  }
  const product = await getProductById(tenantId, productId);
  if (!product) {
    throw new AppError('Produit non trouvé', 'PRODUCT_NOT_FOUND');
  }
  const totalSold = await getSalesSumForPeriod(tenantId, productId, dateFrom, dateTo);
  const days = getDaysInPeriod(dateFrom, dateTo);
  const consommationMoyenne = days > 0 ? totalSold / days : 0;
  const delaiLivraison = product.lead_time_days ?? 7;
  const safetyStock = consommationMoyenne * delaiLivraison * 1.5;
  return { result: Math.round(safetyStock * 1000) / 1000, unit: 'unités', formula_name: 'stock_securite' };
}

async function computeReorderPoint(
  tenantId: string,
  productId: string | undefined,
  dateFrom: string,
  dateTo: string
): Promise<FormulaExecuteResult> {
  if (!productId) {
    throw new AppError('product_id est requis pour point_commande', 'VALIDATION');
  }
  // Fetch product and sales in one pass (avoids double fetch via computeSafetyStock)
  const product = await getProductById(tenantId, productId);
  if (!product) {
    throw new AppError('Produit non trouvé', 'PRODUCT_NOT_FOUND');
  }
  const totalSold = await getSalesSumForPeriod(tenantId, productId, dateFrom, dateTo);
  const days = getDaysInPeriod(dateFrom, dateTo);
  const consommationMoyenne = days > 0 ? totalSold / days : 0;
  const delaiLivraison = product.lead_time_days ?? 7;
  const safetyStock = consommationMoyenne * delaiLivraison * 1.5;
  const reorderPoint = safetyStock + consommationMoyenne * delaiLivraison;
  return { result: Math.round(reorderPoint * 1000) / 1000, unit: 'unités', formula_name: 'point_commande' };
}

async function computeTurnoverRate(
  tenantId: string,
  productId: string | undefined,
  dateFrom: string,
  dateTo: string
): Promise<FormulaExecuteResult> {
  const totalSold = await getSalesSumForPeriod(tenantId, productId, dateFrom, dateTo);
  let stockMoyen: number;
  if (productId) {
    const product = await getProductById(tenantId, productId);
    if (!product) {
      throw new AppError('Produit non trouvé', 'PRODUCT_NOT_FOUND');
    }
    stockMoyen = product.quantity;
  } else {
    const productsResult = await listProducts(tenantId, { limit: 1000 });
    const products = productsResult.data;
    stockMoyen = products.length > 0
      ? products.reduce((acc, p) => acc + p.quantity, 0) / products.length
      : 0;
  }
  if (stockMoyen === 0) {
    return { result: 0, unit: 'sans dimension', formula_name: 'taux_rotation' };
  }
  const rate = totalSold / stockMoyen;
  return { result: Math.round(rate * 1000) / 1000, unit: 'sans dimension', formula_name: 'taux_rotation' };
}

async function computeDaysOfStockRemaining(
  tenantId: string,
  productId: string | undefined,
  dateFrom: string,
  dateTo: string
): Promise<FormulaExecuteResult> {
  if (!productId) {
    throw new AppError('product_id est requis pour jours_stock_restant', 'VALIDATION');
  }
  const product = await getProductById(tenantId, productId);
  if (!product) {
    throw new AppError('Produit non trouvé', 'PRODUCT_NOT_FOUND');
  }
  const totalSold = await getSalesSumForPeriod(tenantId, productId, dateFrom, dateTo);
  const days = getDaysInPeriod(dateFrom, dateTo);
  const consommationQuotidienne = days > 0 ? totalSold / days : 0;
  if (consommationQuotidienne <= 0) {
    // null = stock illimité (consommation nulle)
    return { result: null, unit: 'jours', formula_name: 'jours_stock_restant' };
  }
  const daysRemaining = product.quantity / consommationQuotidienne;
  return { result: Math.round(daysRemaining * 10) / 10, unit: 'jours', formula_name: 'jours_stock_restant' };
}

async function computeAverageCost(
  tenantId: string,
  scope: 'product' | 'all',
  productId?: string
): Promise<FormulaExecuteResult> {
  let products;
  if (scope === 'product' && productId) {
    const p = await getProductById(tenantId, productId);
    if (!p) {
      throw new AppError('Produit non trouvé', 'PRODUCT_NOT_FOUND');
    }
    products = [p];
  } else {
    const productsResult = await listProducts(tenantId, { limit: 1000 });
    products = productsResult.data;
  }
  const withPrice = products.filter((p) => p.purchase_price != null && p.quantity > 0);
  if (withPrice.length === 0) {
    return { result: 0, unit: '€', formula_name: 'cout_stock_moyen' };
  }
  let sumQtyPrice = 0;
  let sumQty = 0;
  for (const p of withPrice) {
    const q = p.quantity;
    const pr = p.purchase_price ?? 0;
    sumQtyPrice += q * pr;
    sumQty += q;
  }
  const avg = sumQty > 0 ? sumQtyPrice / sumQty : 0;
  return { result: Math.round(avg * 100) / 100, unit: '€', formula_name: 'cout_stock_moyen' };
}

async function computeStockValue(
  tenantId: string,
  scope: 'product' | 'all',
  productId?: string
): Promise<FormulaExecuteResult> {
  let products;
  if (scope === 'product' && productId) {
    const p = await getProductById(tenantId, productId);
    if (!p) {
      throw new AppError('Produit non trouvé', 'PRODUCT_NOT_FOUND');
    }
    products = [p];
  } else {
    const productsResult = await listProducts(tenantId, { limit: 1000 });
    products = productsResult.data;
  }
  let total = 0;
  for (const p of products) {
    const pr = p.purchase_price ?? 0;
    total += p.quantity * pr;
  }
  return { result: Math.round(total * 100) / 100, unit: '€', formula_name: 'valeur_stock' };
}

async function computeProfitMargin(
  tenantId: string,
  scope: 'product' | 'all',
  productId?: string
): Promise<FormulaExecuteResult> {
  let products;
  if (scope === 'product' && productId) {
    const p = await getProductById(tenantId, productId);
    if (!p) {
      throw new AppError('Produit non trouvé', 'PRODUCT_NOT_FOUND');
    }
    products = [p];
  } else {
    const productsResult = await listProducts(tenantId, { limit: 1000 });
    products = productsResult.data;
  }
  const withBothPrices = products.filter(
    (p) =>
      p.purchase_price != null &&
      p.selling_price != null &&
      p.selling_price > 0
  );
  if (withBothPrices.length === 0) {
    return { result: 0, unit: '%', formula_name: 'marge_beneficiaire' };
  }
  const margins = withBothPrices.map((p) => {
    const sell = p.selling_price ?? 0;
    const buy = p.purchase_price ?? 0;
    return sell > 0 ? ((sell - buy) / sell) * 100 : 0;
  });
  const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
  return { result: Math.round(avgMargin * 10) / 10, unit: '%', formula_name: 'marge_beneficiaire' };
}

// ============================================================================
// Custom formulas — CRUD + execution (Story 3.4)
// ============================================================================

/**
 * Create a custom formula for a tenant
 */
export async function createCustomFormula(
  tenantId: string,
  userId: string,
  input: FormulaCreateInput
): Promise<Formula> {
  // Validate syntax
  const validation = validateFormulaSyntax(input.formula_expression);
  if (!validation.valid) {
    throw new AppError(validation.error || 'Syntaxe de formule invalide', 'VALIDATION');
  }

  const variablesUsed = extractVariables(input.formula_expression);

  const db = getDatabase();
  const result = await db.queryWithTenant<FormulaRow>(
    tenantId,
    `INSERT INTO formulas (tenant_id, name, description, formula_type, formula_expression, variables_used, is_active, created_by_user_id)
     VALUES ($1, $2, $3, 'custom', $4, $5, true, $6)
     RETURNING id, name, description, formula_expression, variables_used, formula_type, is_active, created_by_user_id`,
    [
      tenantId,
      input.name.trim(),
      input.description?.trim() || null,
      input.formula_expression.trim(),
      variablesUsed,
      userId,
    ]
  );

  return rowToFormula(result.rows[0]);
}

/**
 * List all custom formulas for a tenant
 */
export async function listCustomFormulas(tenantId: string): Promise<Formula[]> {
  const db = getDatabase();
  const result = await db.queryWithTenant<FormulaRow>(
    tenantId,
    `SELECT id, name, description, formula_expression, variables_used, formula_type, is_active, created_by_user_id, created_at
     FROM formulas
     WHERE formula_type = 'custom' AND tenant_id = $1 AND is_active = true
     ORDER BY created_at DESC`,
    [tenantId]
  );
  return result.rows.map(rowToFormula);
}

/**
 * Get a single custom formula by id (tenant-scoped)
 */
export async function getCustomFormulaById(
  tenantId: string,
  formulaId: string
): Promise<Formula | null> {
  const db = getDatabase();
  const result = await db.queryWithTenant<FormulaRow>(
    tenantId,
    `SELECT id, name, description, formula_expression, variables_used, formula_type, is_active, created_by_user_id, created_at
     FROM formulas
     WHERE id = $1 AND formula_type = 'custom' AND tenant_id = $2 AND is_active = true`,
    [formulaId, tenantId]
  );
  if (result.rows.length === 0) return null;
  return rowToFormula(result.rows[0]);
}

/**
 * Update a custom formula
 */
export async function updateCustomFormula(
  tenantId: string,
  formulaId: string,
  input: FormulaUpdateInput
): Promise<Formula | null> {
  // If expression is being updated, validate it
  if (input.formula_expression) {
    const validation = validateFormulaSyntax(input.formula_expression);
    if (!validation.valid) {
      throw new AppError(validation.error || 'Syntaxe de formule invalide', 'VALIDATION');
    }
  }

  const existing = await getCustomFormulaById(tenantId, formulaId);
  if (!existing) return null;

  const name = input.name?.trim() ?? existing.name;
  const description = input.description !== undefined ? (input.description?.trim() || null) : existing.description;
  const formulaExpression = input.formula_expression?.trim() ?? existing.formula_expression;
  const variablesUsed = input.formula_expression
    ? extractVariables(input.formula_expression)
    : existing.variables_used;

  const db = getDatabase();
  const result = await db.queryWithTenant<FormulaRow>(
    tenantId,
    `UPDATE formulas
     SET name = $1, description = $2, formula_expression = $3, variables_used = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5 AND tenant_id = $6 AND formula_type = 'custom' AND is_active = true
     RETURNING id, name, description, formula_expression, variables_used, formula_type, is_active, created_by_user_id`,
    [name, description, formulaExpression, variablesUsed, formulaId, tenantId]
  );

  if (result.rows.length === 0) return null;
  return rowToFormula(result.rows[0]);
}

/**
 * Soft-delete a custom formula
 */
export async function deleteCustomFormula(
  tenantId: string,
  formulaId: string
): Promise<boolean> {
  const db = getDatabase();
  const result = await db.queryWithTenant(
    tenantId,
    `UPDATE formulas
     SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND tenant_id = $2 AND formula_type = 'custom' AND is_active = true`,
    [formulaId, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Variable resolution — fetches real data from DB for formula variables
// ---------------------------------------------------------------------------

/**
 * Resolve variables from DB for a given product.
 * Returns a scope object: { STOCK_ACTUEL: 150, PRIX_ACHAT: 10.5, ... }
 */
export async function resolveVariables(
  tenantId: string,
  productId: string | undefined,
  variableNames: string[],
  periodDays: number = 30
): Promise<Record<string, number>> {
  const scope: Record<string, number> = {};

  if (variableNames.length === 0) return scope;

  // Product-related variables
  const needsProduct = variableNames.some((v) =>
    ['STOCK_ACTUEL', 'PRIX_ACHAT', 'PRIX_VENTE', 'QUANTITE', 'DELAI_LIVRAISON'].includes(v)
  );

  if (needsProduct) {
    if (!productId) {
      throw new AppError(
        'product_id est requis pour les variables de produit (STOCK_ACTUEL, PRIX_ACHAT, etc.)',
        'VALIDATION'
      );
    }
    const product = await getProductById(tenantId, productId);
    if (!product) {
      throw new AppError('Produit non trouvé', 'PRODUCT_NOT_FOUND');
    }

    if (variableNames.includes('STOCK_ACTUEL')) scope['STOCK_ACTUEL'] = product.quantity ?? 0;
    if (variableNames.includes('QUANTITE')) scope['QUANTITE'] = product.quantity ?? 0;
    if (variableNames.includes('PRIX_ACHAT')) scope['PRIX_ACHAT'] = product.purchase_price ?? 0;
    if (variableNames.includes('PRIX_VENTE')) scope['PRIX_VENTE'] = product.selling_price ?? 0;
    if (variableNames.includes('DELAI_LIVRAISON')) scope['DELAI_LIVRAISON'] = product.lead_time_days ?? 7;
  }

  // Sales-related variables — fetch in parallel when multiple are needed
  const needsSales = variableNames.some((v) =>
    ['VENTES_7J', 'VENTES_30J', 'CONSOMMATION_MOYENNE'].includes(v)
  );

  if (needsSales) {
    if (!productId) {
      throw new AppError(
        'product_id est requis pour les variables de ventes (VENTES_7J, VENTES_30J, etc.)',
        'VALIDATION'
      );
    }

    // Build parallel sales queries
    const salesPromises: Promise<void>[] = [];

    if (variableNames.includes('VENTES_7J')) {
      const range7 = resolveDateRange({}, 7);
      salesPromises.push(
        getSalesSumForPeriod(tenantId, productId, range7.date_from, range7.date_to)
          .then((sales7) => { scope['VENTES_7J'] = sales7; })
      );
    }

    if (variableNames.includes('VENTES_30J')) {
      const range30 = resolveDateRange({}, 30);
      salesPromises.push(
        getSalesSumForPeriod(tenantId, productId, range30.date_from, range30.date_to)
          .then((sales30) => { scope['VENTES_30J'] = sales30; })
      );
    }

    if (variableNames.includes('CONSOMMATION_MOYENNE')) {
      const rangeCM = resolveDateRange({}, periodDays);
      salesPromises.push(
        getSalesSumForPeriod(tenantId, productId, rangeCM.date_from, rangeCM.date_to)
          .then((salesCM) => {
            const daysCM = getDaysInPeriod(rangeCM.date_from, rangeCM.date_to);
            scope['CONSOMMATION_MOYENNE'] = daysCM > 0 ? salesCM / daysCM : 0;
          })
      );
    }

    await Promise.all(salesPromises);
  }

  return scope;
}

// ---------------------------------------------------------------------------
// Execute a custom formula using mathjs engine
// ---------------------------------------------------------------------------

async function executeCustomFormula(
  tenantId: string,
  formula: Formula,
  params: FormulaExecuteParams
): Promise<FormulaExecuteResult> {
  const scope = params.scope ?? 'all';
  const periodDays = params.period_days ?? 30;
  const variables = extractVariables(formula.formula_expression);

  // Execute on a single product
  if (scope === 'product' || params.product_id) {
    if (!params.product_id) {
      throw new AppError('product_id est requis pour l\'exécution sur un produit', 'VALIDATION');
    }

    const resolvedScope = await resolveVariables(tenantId, params.product_id, variables, periodDays);
    const result = evaluateExpression(formula.formula_expression, resolvedScope);
    return { result, formula_name: formula.name };
  }

  // Execute on all products — return { product_name: result }
  const productsResult = await listProducts(tenantId, { limit: 1000 });
  const products = productsResult.data;

  if (products.length === 0) {
    return { result: null, formula_name: formula.name };
  }

  // Check if formula needs product-level variables
  const needsProductVars = variables.some((v) =>
    ['STOCK_ACTUEL', 'PRIX_ACHAT', 'PRIX_VENTE', 'QUANTITE', 'DELAI_LIVRAISON', 'VENTES_7J', 'VENTES_30J', 'CONSOMMATION_MOYENNE'].includes(v)
  );

  if (needsProductVars) {
    // Run formula on each product
    const results: Record<string, number | null> = {};
    const errors: Record<string, string> = {};
    for (const product of products) {
      try {
        const resolvedScope = await resolveVariables(tenantId, product.id, variables, periodDays);
        results[product.name] = evaluateExpression(formula.formula_expression, resolvedScope);
      } catch (err) {
        // Report failed products instead of silently returning 0
        errors[product.name] = err instanceof Error ? err.message : 'Erreur d\'évaluation';
      }
    }
    return {
      result: results,
      formula_name: formula.name,
      ...(Object.keys(errors).length > 0 ? { errors } : {}),
    };
  }

  // No product-level variables — evaluate once
  const resolvedScope = await resolveVariables(tenantId, undefined, variables, periodDays);
  const result = evaluateExpression(formula.formula_expression, resolvedScope);
  return { result, formula_name: formula.name };
}

/**
 * Preview a custom formula expression without saving it.
 * Validates, resolves variables, and evaluates.
 */
export async function previewFormula(
  tenantId: string,
  expression: string,
  params: FormulaExecuteParams = {}
): Promise<FormulaExecuteResult> {
  const validation = validateFormulaSyntax(expression);
  if (!validation.valid) {
    throw new AppError(validation.error || 'Syntaxe de formule invalide', 'VALIDATION');
  }

  const variables = extractVariables(expression);
  const periodDays = params.period_days ?? 30;
  const scope = params.scope ?? 'all';

  if (scope === 'product' || params.product_id) {
    if (!params.product_id) {
      throw new AppError('product_id est requis pour la prévisualisation sur un produit', 'VALIDATION');
    }
    const resolvedScope = await resolveVariables(tenantId, params.product_id, variables, periodDays);
    const result = evaluateExpression(expression, resolvedScope);
    return { result, formula_name: 'preview' };
  }

  // All products
  const productsResult = await listProducts(tenantId, { limit: 1000 });
  const products = productsResult.data;

  const needsProductVars = variables.some((v) =>
    ['STOCK_ACTUEL', 'PRIX_ACHAT', 'PRIX_VENTE', 'QUANTITE', 'DELAI_LIVRAISON', 'VENTES_7J', 'VENTES_30J', 'CONSOMMATION_MOYENNE'].includes(v)
  );

  if (needsProductVars && products.length > 0) {
    const results: Record<string, number | null> = {};
    const errors: Record<string, string> = {};
    for (const product of products) {
      try {
        const resolvedScope = await resolveVariables(tenantId, product.id, variables, periodDays);
        results[product.name] = evaluateExpression(expression, resolvedScope);
      } catch (err) {
        errors[product.name] = err instanceof Error ? err.message : 'Erreur d\'évaluation';
      }
    }
    return {
      result: results,
      formula_name: 'preview',
      ...(Object.keys(errors).length > 0 ? { errors } : {}),
    };
  }

  const resolvedScope = await resolveVariables(tenantId, undefined, variables, periodDays);
  const result = evaluateExpression(expression, resolvedScope);
  return { result, formula_name: 'preview' };
}
