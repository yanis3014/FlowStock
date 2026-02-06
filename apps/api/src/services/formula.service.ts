import { getDatabase } from '../database/connection';
import { getSalesSummary } from './sales.service';
import { listProducts, getProductById } from './product.service';

export interface Formula {
  id: string;
  name: string;
  description: string | null;
  formula_expression: string;
  variables_used: string[];
  formula_type: 'predefined' | 'custom';
  is_active: boolean;
}

export interface FormulaExecuteParams {
  product_id?: string;
  period_days?: number;
  date_from?: string;
  date_to?: string;
  scope?: 'product' | 'all';
}

export interface FormulaExecuteResult {
  result: number | Record<string, number> | null;
  unit?: string;
  formula_name?: string;
}

interface FormulaRow {
  id: string;
  name: string;
  description: string | null;
  formula_expression: string;
  variables_used: string[] | null;
  formula_type: string;
  is_active: boolean;
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
 * Execute a predefined formula with given params
 */
export async function executeFormula(
  tenantId: string,
  formulaId: string,
  params: FormulaExecuteParams = {}
): Promise<FormulaExecuteResult> {
  const formula = await getPredefinedFormulaById(tenantId, formulaId);
  if (!formula) {
    const err = new Error('Formula not found');
    (err as Error & { code?: string }).code = 'FORMULA_NOT_FOUND';
    throw err;
  }

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
      const err = new Error(`Unknown predefined formula: ${formula.name}`);
      (err as Error & { code?: string }).code = 'FORMULA_NOT_FOUND';
      throw err;
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
    const err = new Error('product_id is required for consommation_moyenne');
    (err as Error & { code?: string }).code = 'VALIDATION';
    throw err;
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
    const err = new Error('product_id is required for stock_securite');
    (err as Error & { code?: string }).code = 'VALIDATION';
    throw err;
  }
  const product = await getProductById(tenantId, productId);
  if (!product) {
    const err = new Error('Product not found');
    (err as Error & { code?: string }).code = 'PRODUCT_NOT_FOUND';
    throw err;
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
    const err = new Error('product_id is required for point_commande');
    (err as Error & { code?: string }).code = 'VALIDATION';
    throw err;
  }
  const safetyResult = await computeSafetyStock(tenantId, productId, dateFrom, dateTo);
  const product = await getProductById(tenantId, productId);
  if (!product) {
    const err = new Error('Product not found');
    (err as Error & { code?: string }).code = 'PRODUCT_NOT_FOUND';
    throw err;
  }
  const totalSold = await getSalesSumForPeriod(tenantId, productId, dateFrom, dateTo);
  const days = getDaysInPeriod(dateFrom, dateTo);
  const consommationMoyenne = days > 0 ? totalSold / days : 0;
  const delaiLivraison = product.lead_time_days ?? 7;
  const safetyStock = safetyResult.result as number;
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
      const err = new Error('Product not found');
      (err as Error & { code?: string }).code = 'PRODUCT_NOT_FOUND';
      throw err;
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
    const err = new Error('product_id is required for jours_stock_restant');
    (err as Error & { code?: string }).code = 'VALIDATION';
    throw err;
  }
  const product = await getProductById(tenantId, productId);
  if (!product) {
    const err = new Error('Product not found');
    (err as Error & { code?: string }).code = 'PRODUCT_NOT_FOUND';
    throw err;
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
  const productsResult = await listProducts(tenantId, { limit: 1000 });
  let products = productsResult.data;
  if (scope === 'product' && productId) {
    const p = await getProductById(tenantId, productId);
    if (!p) {
      const err = new Error('Product not found');
      (err as Error & { code?: string }).code = 'PRODUCT_NOT_FOUND';
      throw err;
    }
    products = [p];
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
  if (scope === 'product' && productId && products.length === 1) {
    return { result: Math.round(avg * 100) / 100, unit: '€', formula_name: 'cout_stock_moyen' };
  }
  return { result: Math.round(avg * 100) / 100, unit: '€', formula_name: 'cout_stock_moyen' };
}

async function computeStockValue(
  tenantId: string,
  scope: 'product' | 'all',
  productId?: string
): Promise<FormulaExecuteResult> {
  const productsResult = await listProducts(tenantId, { limit: 1000 });
  let products = productsResult.data;
  if (scope === 'product' && productId) {
    const p = await getProductById(tenantId, productId);
    if (!p) {
      const err = new Error('Product not found');
      (err as Error & { code?: string }).code = 'PRODUCT_NOT_FOUND';
      throw err;
    }
    products = [p];
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
  const productsResult = await listProducts(tenantId, { limit: 1000 });
  let products = productsResult.data;
  if (scope === 'product' && productId) {
    const p = await getProductById(tenantId, productId);
    if (!p) {
      const err = new Error('Product not found');
      (err as Error & { code?: string }).code = 'PRODUCT_NOT_FOUND';
      throw err;
    }
    products = [p];
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
  if (scope === 'product' && productId && products.length === 1) {
    const p = products[0];
    const sell = p.selling_price ?? 0;
    const buy = p.purchase_price ?? 0;
    const margin = sell > 0 ? ((sell - buy) / sell) * 100 : 0;
    return { result: Math.round(margin * 10) / 10, unit: '%', formula_name: 'marge_beneficiaire' };
  }
  const margins = withBothPrices.map((p) => {
    const sell = p.selling_price ?? 0;
    const buy = p.purchase_price ?? 0;
    return sell > 0 ? ((sell - buy) / sell) * 100 : 0;
  });
  const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
  return { result: Math.round(avgMargin * 10) / 10, unit: '%', formula_name: 'marge_beneficiaire' };
}
