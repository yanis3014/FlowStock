/**
 * Custom Formula Engine — sandboxed mathjs for safe evaluation of user formulas.
 * Story 3.4: Formules Personnalisées
 */
import { create, all, MathNode } from 'mathjs';

// ---------------------------------------------------------------------------
// AppError — typed error class for structured error handling
// ---------------------------------------------------------------------------

export class AppError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AppError';
  }
}

// ---------------------------------------------------------------------------
// Sandboxed mathjs instance — limited scope, no dangerous imports
// ---------------------------------------------------------------------------

const math = create(all);

/** Maximum AST node count to prevent overly complex expressions */
const MAX_AST_NODES = 150;

// Block dangerous user-facing functions — keep parse/compile for internal use
const BLOCKED_FUNCTIONS = [
  'import',
  'createUnit',
  'evaluate',
  'simplify',
  'derivative',
  'resolve',
];

const importedMath = math.import as (obj: Record<string, unknown>, opts?: { override: boolean }) => void;

// Disable dangerous functions by overriding with throwing stubs
const overrides: Record<string, unknown> = {};
for (const fn of BLOCKED_FUNCTIONS) {
  overrides[fn] = function () {
    throw new Error(`Fonction "${fn}" non autorisée`);
  };
}
importedMath(overrides, { override: true });

// ---------------------------------------------------------------------------
// Available variables — data references users can use in their formulas
// ---------------------------------------------------------------------------

export interface VariableDefinition {
  name: string;
  description: string;
  requiresProduct: boolean;
}

export const AVAILABLE_VARIABLES: VariableDefinition[] = [
  { name: 'STOCK_ACTUEL', description: 'Quantité en stock du produit', requiresProduct: true },
  { name: 'PRIX_ACHAT', description: "Prix d'achat unitaire du produit", requiresProduct: true },
  { name: 'PRIX_VENTE', description: 'Prix de vente unitaire du produit', requiresProduct: true },
  { name: 'QUANTITE', description: 'Quantité en stock (alias de STOCK_ACTUEL)', requiresProduct: true },
  { name: 'DELAI_LIVRAISON', description: 'Délai de livraison en jours', requiresProduct: true },
  { name: 'VENTES_7J', description: 'Total des ventes sur les 7 derniers jours', requiresProduct: true },
  { name: 'VENTES_30J', description: 'Total des ventes sur les 30 derniers jours', requiresProduct: true },
  { name: 'CONSOMMATION_MOYENNE', description: 'Consommation moyenne quotidienne (30 jours)', requiresProduct: true },
];

const VARIABLE_NAMES = new Set(AVAILABLE_VARIABLES.map((v) => v.name));

// ---------------------------------------------------------------------------
// Available functions documentation
// ---------------------------------------------------------------------------

export const AVAILABLE_FUNCTIONS: string[] = [
  'SUM',
  'AVG',
  'MAX',
  'MIN',
  'COUNT',
  'ABS',
  'ROUND',
  'CEIL',
  'FLOOR',
  'SQRT',
  'POW',
  'IF',
];

// ---------------------------------------------------------------------------
// AST complexity guard — prevents DoS via overly complex expressions
// ---------------------------------------------------------------------------

/**
 * Counts the number of nodes in a mathjs AST.
 * Throws if the count exceeds MAX_AST_NODES.
 */
function countASTNodes(node: MathNode, current = 0): number {
  let count = current + 1;
  if (count > MAX_AST_NODES) {
    throw new AppError(
      `Expression trop complexe (limite : ${MAX_AST_NODES} nœuds). Simplifiez la formule.`,
      'VALIDATION'
    );
  }
  // Traverse children via forEach if available
  if ('forEach' in node && typeof node.forEach === 'function') {
    (node as MathNode & { forEach: (cb: (child: MathNode) => void) => void }).forEach(
      (child: MathNode) => {
        count = countASTNodes(child, count);
      }
    );
  }
  return count;
}

// ---------------------------------------------------------------------------
// Extract variables from an expression
// ---------------------------------------------------------------------------

/**
 * Extracts known variable names referenced in a formula expression.
 * Looks for uppercase identifiers matching known variable names.
 */
export function extractVariables(expression: string): string[] {
  // Match uppercase identifiers: sequences of [A-Z0-9_] that look like variable names
  const matches = expression.match(/\b([A-Z][A-Z0-9_]*)\b/g);
  if (!matches) return [];
  const unique = [...new Set(matches)];
  // Only return names that are known variables (not function names)
  const functionNamesUpper = new Set(AVAILABLE_FUNCTIONS.map((f) => f.toUpperCase()));
  return unique.filter((m) => VARIABLE_NAMES.has(m) && !functionNamesUpper.has(m));
}

// ---------------------------------------------------------------------------
// Validate formula syntax
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  error?: string;
  /** Approximate character index of the error in the expression (0-based), if available */
  error_position?: number;
  variables_detected: string[];
}

/**
 * Validates formula syntax using mathjs parser without evaluating.
 * Also checks that all referenced variables are known.
 */
export function validateFormulaSyntax(expression: string): ValidationResult {
  if (!expression || expression.trim().length === 0) {
    return { valid: false, error: 'Expression vide', variables_detected: [] };
  }

  if (expression.length > 2000) {
    return {
      valid: false,
      error: 'Expression trop longue (max 2000 caractères)',
      variables_detected: [],
    };
  }

  const variables = extractVariables(expression);

  // Check for unknown uppercase identifiers (potential unknown variables)
  const allUpperIdentifiers = expression.match(/\b([A-Z][A-Z0-9_]*)\b/g) || [];
  const uniqueUpper = [...new Set(allUpperIdentifiers)];
  const functionNamesUpper = new Set(AVAILABLE_FUNCTIONS.map((f) => f.toUpperCase()));
  const unknownVars = uniqueUpper.filter(
    (name) => !VARIABLE_NAMES.has(name) && !functionNamesUpper.has(name)
  );

  if (unknownVars.length > 0) {
    return {
      valid: false,
      error: `Variable inconnue : ${unknownVars.join(', ')}`,
      variables_detected: variables,
    };
  }

  // Try parsing with mathjs — replace variables with dummy values for syntax check
  let testExpression = expression;
  for (const v of variables) {
    testExpression = testExpression.replace(new RegExp(`\\b${v}\\b`, 'g'), '1');
  }

  try {
    const parsed = math.parse(testExpression);
    // Check AST complexity to prevent DoS
    countASTNodes(parsed);
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return { valid: false, error: err.message, variables_detected: variables };
    }
    const message = err instanceof Error ? err.message : String(err);
    const errorPosition = extractErrorPosition(message);
    const translated = translateMathError(message);
    return { valid: false, error: translated, error_position: errorPosition, variables_detected: variables };
  }

  return { valid: true, variables_detected: variables };
}

/**
 * Extracts character position from a mathjs error message.
 * Returns 0-based character index or undefined if not parseable.
 */
function extractErrorPosition(message: string): number | undefined {
  // mathjs errors often include "char N" or "column N"
  const charMatch = message.match(/char\s+(\d+)/i) || message.match(/column\s+(\d+)/i);
  if (charMatch) return Math.max(0, parseInt(charMatch[1]) - 1);
  return undefined;
}

function translateMathError(message: string): string {
  if (message.includes('Unexpected end of expression')) {
    return 'Expression incomplète — vérifiez les parenthèses et opérateurs';
  }
  if (message.includes('Parenthesis') || message.includes('parenthesis')) {
    return 'Parenthèse manquante ou mal placée';
  }
  if (message.includes('Unexpected type')) {
    return 'Type inattendu dans l\'expression';
  }
  if (message.includes('Value expected')) {
    return 'Valeur attendue — vérifiez la syntaxe de l\'expression';
  }
  if (message.includes('Unknown symbol') || message.includes('Undefined symbol')) {
    return `Symbole inconnu — ${message}`;
  }
  return `Syntaxe invalide : ${message}`;
}

// ---------------------------------------------------------------------------
// Evaluate expression
// ---------------------------------------------------------------------------

/**
 * Evaluates a formula expression with the given variable scope.
 * Returns a number result.
 * Throws on evaluation errors (division by zero, etc.)
 *
 * NOTE: The IF function evaluates all branches eagerly (mathjs limitation).
 * IF(CONSO > 0, STOCK / CONSO, 0) will still attempt the division even when CONSO = 0.
 * Use guard patterns like: STOCK / MAX(CONSO, 0.001) instead.
 */
export function evaluateExpression(
  expression: string,
  scope: Record<string, number>
): number {
  // Build scope with custom functions mapped to mathjs equivalents
  const evalScope: Record<string, unknown> = { ...scope };

  // Map custom function names to mathjs equivalents
  // SUM, AVG, MAX, MIN are already available as sum, mean, max, min in mathjs
  // We add uppercase aliases
  evalScope['SUM'] = math.sum;
  evalScope['AVG'] = math.mean;
  evalScope['MAX'] = math.max;
  evalScope['MIN'] = math.min;
  evalScope['COUNT'] = function (...args: unknown[]): number {
    // Flatten arrays and count elements
    const flat = args.flat(Infinity);
    return flat.length;
  };
  evalScope['ABS'] = math.abs;
  evalScope['ROUND'] = math.round;
  evalScope['CEIL'] = math.ceil;
  evalScope['FLOOR'] = math.floor;
  evalScope['SQRT'] = math.sqrt;
  evalScope['POW'] = math.pow;

  // Custom IF function: IF(condition, trueValue, falseValue)
  // Note: mathjs evaluates all arguments eagerly — both branches are computed.
  evalScope['IF'] = function (condition: unknown, trueVal: unknown, falseVal: unknown): unknown {
    return condition ? trueVal : falseVal;
  };

  try {
    const node: MathNode = math.parse(expression);
    // Guard against overly complex expressions (DoS prevention)
    countASTNodes(node);
    const compiled = node.compile();
    const result = compiled.evaluate(evalScope);

    // Result might be a mathjs type — convert to number
    if (typeof result === 'number') {
      if (!isFinite(result)) {
        throw new Error('Résultat infini — vérifiez les divisions par zéro');
      }
      return Math.round(result * 10000) / 10000; // 4 decimal precision
    }

    if (typeof result === 'object' && result !== null && 'toNumber' in result) {
      const num = (result as { toNumber: () => number }).toNumber();
      if (!isFinite(num)) {
        throw new Error('Résultat infini — vérifiez les divisions par zéro');
      }
      return Math.round(num * 10000) / 10000;
    }

    if (typeof result === 'boolean') {
      return result ? 1 : 0;
    }

    throw new Error('Le résultat de la formule n\'est pas un nombre');
  } catch (err: unknown) {
    if (err instanceof Error) {
      // Check for division by zero
      if (err.message.includes('Division by zero') || err.message.includes('Infinity')) {
        throw new Error('Division par zéro détectée');
      }
      throw err;
    }
    throw new Error('Erreur d\'évaluation de la formule');
  }
}

// ---------------------------------------------------------------------------
// Get available variables info (for API/autocomplete)
// ---------------------------------------------------------------------------

export function getAvailableVariables(): VariableDefinition[] {
  return [...AVAILABLE_VARIABLES];
}

export function getAvailableFunctions(): string[] {
  return [...AVAILABLE_FUNCTIONS];
}
