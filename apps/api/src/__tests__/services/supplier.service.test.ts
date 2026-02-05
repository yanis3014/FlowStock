import {
  createSupplier,
  updateSupplier,
  listSuppliers,
} from '../../services/supplier.service';
import { closeDatabase } from '../../database/connection';

describe('supplier.service', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';

  afterAll(async () => {
    await closeDatabase();
  });

  describe('createSupplier validation', () => {
    it('should throw when name is empty', async () => {
      await expect(
        createSupplier(tenantId, { name: '' })
      ).rejects.toThrow('name is required');
    });

    it('should throw when name is only whitespace', async () => {
      await expect(
        createSupplier(tenantId, { name: '   ' })
      ).rejects.toThrow('name is required');
    });

    it('should throw when email format is invalid', async () => {
      await expect(
        createSupplier(tenantId, { name: 'Test Supplier', email: 'not-an-email' })
      ).rejects.toThrow('Invalid email format');
    });
  });

  describe('updateSupplier validation', () => {
    it('should throw when name is set to empty', async () => {
      await expect(
        updateSupplier(tenantId, '00000000-0000-0000-0000-000000000002', { name: '' })
      ).rejects.toThrow('name cannot be empty');
    });

    it('should throw when email format is invalid', async () => {
      await expect(
        updateSupplier(tenantId, '00000000-0000-0000-0000-000000000002', { email: 'bad' })
      ).rejects.toThrow('Invalid email format');
    });
  });

  describe('listSuppliers', () => {
    it('should accept empty filters', async () => {
      const result = await listSuppliers(tenantId, {});
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
      const result = await listSuppliers(tenantId, { page: 2, limit: 10 });
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
    });
  });
});
