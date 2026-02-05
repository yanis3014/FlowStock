import { getRetentionDays, listMovements, getMovementsForExport, movementsToCsv } from '../../services/stockMovement.service';
import { closeDatabase } from '../../database/connection';

describe('stockMovement.service', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const productId = '00000000-0000-0000-0000-000000000002';

  afterAll(async () => {
    await closeDatabase();
  });

  describe('getRetentionDays', () => {
    it('should return a number (default or from subscription)', async () => {
      const days = await getRetentionDays(tenantId);
      expect(typeof days).toBe('number');
      expect(days).toBeGreaterThanOrEqual(0);
    });
  });

  describe('listMovements', () => {
    it('should return data, pagination and retention_days', async () => {
      const result = await listMovements(tenantId, productId, {});
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result).toHaveProperty('retention_days');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: expect.any(Number),
        total: expect.any(Number),
        total_pages: expect.any(Number),
      });
    });

    it('should accept filters', async () => {
      const result = await listMovements(tenantId, productId, {
        page: 2,
        limit: 5,
        movement_type: 'creation',
      });
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
    });
  });

  describe('getMovementsForExport', () => {
    it('should return movements and retention_days', async () => {
      const result = await getMovementsForExport(tenantId, productId, {});
      expect(result).toHaveProperty('movements');
      expect(result).toHaveProperty('retention_days');
      expect(result).toHaveProperty('truncated');
      expect(Array.isArray(result.movements)).toBe(true);
    });
  });

  describe('movementsToCsv', () => {
    it('should return CSV string with header', () => {
      const csv = movementsToCsv([
        {
          id: 'id1',
          product_id: productId,
          movement_type: 'creation',
          quantity_before: null,
          quantity_after: 10,
          user_id: null,
          user_email: null,
          reason: null,
          created_at: '2026-02-04T12:00:00.000Z',
        },
      ]);
      expect(csv).toContain('date;type;utilisateur');
      expect(csv).toContain('creation');
      expect(csv).toContain('10');
    });
  });
});
