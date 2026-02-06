import {
  validateFormulaSyntax,
  extractVariables,
  evaluateExpression,
  getAvailableVariables,
  getAvailableFunctions,
} from '../../services/custom-formula-engine';

describe('custom-formula-engine', () => {
  // ==========================================================================
  // extractVariables
  // ==========================================================================
  describe('extractVariables', () => {
    it('should extract known variables from expression', () => {
      const vars = extractVariables('STOCK_ACTUEL * PRIX_ACHAT');
      expect(vars).toContain('STOCK_ACTUEL');
      expect(vars).toContain('PRIX_ACHAT');
      expect(vars).toHaveLength(2);
    });

    it('should not extract function names as variables', () => {
      const vars = extractVariables('SUM(STOCK_ACTUEL, PRIX_VENTE)');
      expect(vars).toContain('STOCK_ACTUEL');
      expect(vars).toContain('PRIX_VENTE');
      expect(vars).not.toContain('SUM');
    });

    it('should return empty array for expression without variables', () => {
      const vars = extractVariables('2 + 3 * 4');
      expect(vars).toHaveLength(0);
    });

    it('should return unique variables only', () => {
      const vars = extractVariables('STOCK_ACTUEL + STOCK_ACTUEL * 2');
      expect(vars).toEqual(['STOCK_ACTUEL']);
    });

    it('should ignore unknown uppercase identifiers', () => {
      const vars = extractVariables('STOCK_ACTUEL + UNKNOWN_VAR');
      expect(vars).toContain('STOCK_ACTUEL');
      expect(vars).not.toContain('UNKNOWN_VAR');
    });

    it('should extract all supported variables', () => {
      const expr = 'STOCK_ACTUEL + PRIX_ACHAT + PRIX_VENTE + QUANTITE + DELAI_LIVRAISON + VENTES_7J + VENTES_30J + CONSOMMATION_MOYENNE';
      const vars = extractVariables(expr);
      expect(vars).toHaveLength(8);
    });
  });

  // ==========================================================================
  // validateFormulaSyntax
  // ==========================================================================
  describe('validateFormulaSyntax', () => {
    it('should validate a simple arithmetic expression', () => {
      const result = validateFormulaSyntax('2 + 3');
      expect(result.valid).toBe(true);
      expect(result.variables_detected).toHaveLength(0);
    });

    it('should validate expression with known variables', () => {
      const result = validateFormulaSyntax('STOCK_ACTUEL * PRIX_ACHAT');
      expect(result.valid).toBe(true);
      expect(result.variables_detected).toContain('STOCK_ACTUEL');
      expect(result.variables_detected).toContain('PRIX_ACHAT');
    });

    it('should validate complex expression with functions', () => {
      const result = validateFormulaSyntax('(PRIX_VENTE - PRIX_ACHAT) / PRIX_VENTE * 100');
      expect(result.valid).toBe(true);
    });

    it('should reject empty expression', () => {
      const result = validateFormulaSyntax('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Expression vide');
    });

    it('should reject expression that is too long', () => {
      const longExpr = 'STOCK_ACTUEL + '.repeat(200);
      const result = validateFormulaSyntax(longExpr);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('trop longue');
    });

    it('should reject unknown variables', () => {
      const result = validateFormulaSyntax('STOCK_ACTUEL + UNKNOWN_VAR');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Variable inconnue');
      expect(result.error).toContain('UNKNOWN_VAR');
    });

    it('should reject incomplete expression', () => {
      const result = validateFormulaSyntax('2 +');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject unmatched parenthesis', () => {
      const result = validateFormulaSyntax('(STOCK_ACTUEL * 2');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should accept IF function', () => {
      const result = validateFormulaSyntax('IF(STOCK_ACTUEL > 10, 1, 0)');
      expect(result.valid).toBe(true);
    });

    it('should accept nested function calls', () => {
      const result = validateFormulaSyntax('MAX(PRIX_VENTE - PRIX_ACHAT, 0)');
      expect(result.valid).toBe(true);
    });

    it('should accept power operator', () => {
      const result = validateFormulaSyntax('STOCK_ACTUEL ^ 2');
      expect(result.valid).toBe(true);
    });
  });

  // ==========================================================================
  // evaluateExpression
  // ==========================================================================
  describe('evaluateExpression', () => {
    it('should evaluate simple arithmetic', () => {
      const result = evaluateExpression('2 + 3', {});
      expect(result).toBe(5);
    });

    it('should evaluate with variables', () => {
      const result = evaluateExpression('STOCK_ACTUEL * PRIX_ACHAT', {
        STOCK_ACTUEL: 100,
        PRIX_ACHAT: 10.5,
      });
      expect(result).toBe(1050);
    });

    it('should evaluate margin formula', () => {
      const result = evaluateExpression('(PRIX_VENTE - PRIX_ACHAT) / PRIX_VENTE * 100', {
        PRIX_VENTE: 20,
        PRIX_ACHAT: 10,
      });
      expect(result).toBe(50);
    });

    it('should evaluate SUM function', () => {
      const result = evaluateExpression('SUM(1, 2, 3)', {});
      expect(result).toBe(6);
    });

    it('should evaluate AVG function', () => {
      const result = evaluateExpression('AVG(2, 4, 6)', {});
      expect(result).toBe(4);
    });

    it('should evaluate MAX function', () => {
      const result = evaluateExpression('MAX(1, 5, 3)', {});
      expect(result).toBe(5);
    });

    it('should evaluate MIN function', () => {
      const result = evaluateExpression('MIN(1, 5, 3)', {});
      expect(result).toBe(1);
    });

    it('should evaluate ABS function', () => {
      const result = evaluateExpression('ABS(-5)', {});
      expect(result).toBe(5);
    });

    it('should evaluate ROUND function', () => {
      const result = evaluateExpression('ROUND(3.7)', {});
      expect(result).toBe(4);
    });

    it('should evaluate CEIL function', () => {
      const result = evaluateExpression('CEIL(3.2)', {});
      expect(result).toBe(4);
    });

    it('should evaluate FLOOR function', () => {
      const result = evaluateExpression('FLOOR(3.9)', {});
      expect(result).toBe(3);
    });

    it('should evaluate SQRT function', () => {
      const result = evaluateExpression('SQRT(16)', {});
      expect(result).toBe(4);
    });

    it('should evaluate POW function', () => {
      const result = evaluateExpression('POW(2, 3)', {});
      expect(result).toBe(8);
    });

    it('should evaluate IF function (true)', () => {
      const result = evaluateExpression('IF(1 > 0, 10, 20)', {});
      expect(result).toBe(10);
    });

    it('should evaluate IF function (false)', () => {
      const result = evaluateExpression('IF(0 > 1, 10, 20)', {});
      expect(result).toBe(20);
    });

    it('should evaluate power operator', () => {
      const result = evaluateExpression('2 ^ 3', {});
      expect(result).toBe(8);
    });

    it('should throw on division by zero', () => {
      expect(() => evaluateExpression('10 / 0', {})).toThrow();
    });

    it('should handle complex real-world formula', () => {
      const result = evaluateExpression(
        'STOCK_ACTUEL / CONSOMMATION_MOYENNE',
        { STOCK_ACTUEL: 100, CONSOMMATION_MOYENNE: 5 }
      );
      expect(result).toBe(20);
    });

    it('should return rounded result with 4 decimal precision', () => {
      const result = evaluateExpression('10 / 3', {});
      expect(result).toBe(3.3333);
    });
  });

  // ==========================================================================
  // Security tests
  // ==========================================================================
  describe('security', () => {
    it('should block import function', () => {
      // mathjs import is overridden to throw
      expect(() => evaluateExpression('import("os")', {})).toThrow();
    });

    it('should not allow access to process', () => {
      const result = validateFormulaSyntax('process');
      // 'process' is lowercase, not a known variable/function, but mathjs might parse it
      // The key is that evaluateExpression should not give access to Node process
      expect(() => evaluateExpression('process', {})).toThrow();
    });
  });

  // ==========================================================================
  // getAvailableVariables / getAvailableFunctions
  // ==========================================================================
  describe('getAvailableVariables', () => {
    it('should return all available variables', () => {
      const vars = getAvailableVariables();
      expect(vars.length).toBeGreaterThanOrEqual(8);
      const names = vars.map(v => v.name);
      expect(names).toContain('STOCK_ACTUEL');
      expect(names).toContain('PRIX_ACHAT');
      expect(names).toContain('PRIX_VENTE');
      expect(names).toContain('QUANTITE');
      expect(names).toContain('DELAI_LIVRAISON');
      expect(names).toContain('VENTES_7J');
      expect(names).toContain('VENTES_30J');
      expect(names).toContain('CONSOMMATION_MOYENNE');
    });

    it('should include description and requiresProduct for each variable', () => {
      const vars = getAvailableVariables();
      for (const v of vars) {
        expect(v.name).toBeDefined();
        expect(v.description).toBeDefined();
        expect(typeof v.requiresProduct).toBe('boolean');
      }
    });
  });

  describe('getAvailableFunctions', () => {
    it('should return all available functions', () => {
      const funcs = getAvailableFunctions();
      expect(funcs).toContain('SUM');
      expect(funcs).toContain('AVG');
      expect(funcs).toContain('MAX');
      expect(funcs).toContain('MIN');
      expect(funcs).toContain('COUNT');
      expect(funcs).toContain('IF');
      expect(funcs).toContain('ABS');
      expect(funcs).toContain('ROUND');
    });
  });

  // ==========================================================================
  // COUNT function
  // ==========================================================================
  describe('COUNT function', () => {
    it('should count the number of arguments', () => {
      const result = evaluateExpression('COUNT(1, 2, 3)', {});
      expect(result).toBe(3);
    });

    it('should not be extracted as a variable', () => {
      const vars = extractVariables('COUNT(STOCK_ACTUEL, PRIX_VENTE)');
      expect(vars).toContain('STOCK_ACTUEL');
      expect(vars).toContain('PRIX_VENTE');
      expect(vars).not.toContain('COUNT');
    });
  });

  // ==========================================================================
  // AST complexity guard
  // ==========================================================================
  describe('AST complexity guard', () => {
    it('should reject overly complex expressions in validation', () => {
      // Build an extremely long but syntactically valid expression
      const longExpr = Array.from({ length: 200 }, (_, i) => `${i + 1}`).join(' + ');
      const result = validateFormulaSyntax(longExpr);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('trop complexe');
    });

    it('should reject overly complex expressions in evaluation', () => {
      const longExpr = Array.from({ length: 200 }, (_, i) => `${i + 1}`).join(' + ');
      expect(() => evaluateExpression(longExpr, {})).toThrow(/trop complexe/);
    });

    it('should accept a reasonably complex expression', () => {
      const expr = '(STOCK_ACTUEL * PRIX_ACHAT + PRIX_VENTE) / MAX(CONSOMMATION_MOYENNE, 1)';
      const result = evaluateExpression(expr, {
        STOCK_ACTUEL: 100, PRIX_ACHAT: 10, PRIX_VENTE: 25, CONSOMMATION_MOYENNE: 5,
      });
      expect(typeof result).toBe('number');
    });
  });
});
