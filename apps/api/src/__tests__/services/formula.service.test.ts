import {
  listPredefinedFormulas,
  getPredefinedFormulaById,
  executeFormula,
} from '../../services/formula.service';
import { closeDatabase } from '../../database/connection';

describe('formula.service', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const nonExistentId = '00000000-0000-0000-0000-000000000099';

  afterAll(async () => {
    await closeDatabase();
  });

  describe('listPredefinedFormulas', () => {
    it('should return array of 8 predefined formulas when seeded', async () => {
      const result = await listPredefinedFormulas(tenantId);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBe(8);
      const expectedNames = [
        'consommation_moyenne',
        'stock_securite',
        'point_commande',
        'taux_rotation',
        'jours_stock_restant',
        'cout_stock_moyen',
        'valeur_stock',
        'marge_beneficiaire',
      ];
      const names = result.map((f) => f.name);
      for (const n of expectedNames) {
        expect(names).toContain(n);
      }
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        formula_expression: expect.any(String),
        formula_type: 'predefined',
      });
    });
  });

  describe('getPredefinedFormulaById', () => {
    it('should return null when formula does not exist', async () => {
      const result = await getPredefinedFormulaById(tenantId, nonExistentId);
      expect(result).toBeNull();
    });

    it('should return formula when it exists (if seeded)', async () => {
      const list = await listPredefinedFormulas(tenantId);
      if (list.length > 0) {
        const first = list[0];
        const result = await getPredefinedFormulaById(tenantId, first.id);
        expect(result).not.toBeNull();
        expect(result?.id).toBe(first.id);
        expect(result?.name).toBe(first.name);
      }
    });
  });

  describe('executeFormula', () => {
    it('should throw FORMULA_NOT_FOUND for non-existent formula id', async () => {
      await expect(
        executeFormula(tenantId, nonExistentId, {})
      ).rejects.toMatchObject({ code: 'FORMULA_NOT_FOUND' });
    });

    it('should throw VALIDATION when product_id required but missing (consommation_moyenne)', async () => {
      const list = await listPredefinedFormulas(tenantId);
      const conso = list.find((f) => f.name === 'consommation_moyenne');
      if (!conso) return; // skip if not seeded
      await expect(
        executeFormula(tenantId, conso.id, { period_days: 30 })
      ).rejects.toMatchObject({ code: 'VALIDATION' });
    });
  });
});
