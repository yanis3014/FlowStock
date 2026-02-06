import {
  listSales,
  getSaleById,
  getSalesSummary,
  getSalesStats,
  createSale,
  updateSale,
  deleteSale,
} from '../../services/sales.service';
import { closeDatabase } from '../../database/connection';

describe('sales.service', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const nonExistentId = '00000000-0000-0000-0000-000000000099';

  afterAll(async () => {
    await closeDatabase();
  });

  describe('getSaleById', () => {
    it('should return null when sale does not exist', async () => {
      const result = await getSaleById(tenantId, nonExistentId);
      expect(result).toBeNull();
    });
  });

  describe('createSale validation', () => {
    it('should throw PRODUCT_NOT_FOUND when product_id does not exist', async () => {
      await expect(
        createSale(tenantId, {
          product_id: nonExistentId,
          sale_date: new Date().toISOString(),
          quantity_sold: 5,
        })
      ).rejects.toMatchObject({ code: 'PRODUCT_NOT_FOUND' });
    });

    it('should throw PRODUCT_NOT_FOUND when product_id is omitted (sale_date optional)', async () => {
      await expect(
        createSale(tenantId, {
          product_id: nonExistentId,
          quantity_sold: 1,
        })
      ).rejects.toMatchObject({ code: 'PRODUCT_NOT_FOUND' });
    });
  });

  describe('listSales', () => {
    it('should accept empty filters', async () => {
      const result = await listSales(tenantId, {});
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 50,
        total: expect.any(Number),
        total_pages: expect.any(Number),
      });
    });

    it('should accept page and limit', async () => {
      const result = await listSales(tenantId, { page: 2, limit: 10 });
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
    });
  });

  describe('getSalesSummary', () => {
    it('should return groups array', async () => {
      const result = await getSalesSummary(tenantId, { group_by: 'day' });
      expect(result).toHaveProperty('groups');
      expect(Array.isArray(result.groups)).toBe(true);
    });
  });

  describe('getSalesStats', () => {
    it('should return today, yesterday, this_week, this_month', async () => {
      const result = await getSalesStats(tenantId);
      expect(result).toHaveProperty('today');
      expect(result).toHaveProperty('yesterday');
      expect(result).toHaveProperty('this_week');
      expect(result).toHaveProperty('this_month');
      expect(result.today).toMatchObject({
        quantity_sold: expect.any(Number),
        count: expect.any(Number),
      });
    });
  });

  describe('updateSale', () => {
    it('should return null when sale does not exist', async () => {
      const result = await updateSale(tenantId, nonExistentId, {
        quantity_sold: 2,
        unit_price: 10,
      });
      expect(result).toBeNull();
    });
  });

  describe('deleteSale', () => {
    it('should return false when sale does not exist', async () => {
      const result = await deleteSale(tenantId, nonExistentId);
      expect(result).toBe(false);
    });
  });
});
