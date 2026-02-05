import {
  createLocation,
  updateLocation,
  listLocations,
} from '../../services/location.service';
import { closeDatabase } from '../../database/connection';

describe('location.service', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';

  afterAll(async () => {
    await closeDatabase();
  });

  describe('createLocation validation', () => {
    it('should throw when name is empty', async () => {
      await expect(
        createLocation(tenantId, { name: '' })
      ).rejects.toThrow('name is required');
    });

    it('should throw when name is only whitespace', async () => {
      await expect(
        createLocation(tenantId, { name: '   ' })
      ).rejects.toThrow('name is required');
    });
  });

  describe('updateLocation validation', () => {
    it('should throw when name is set to empty', async () => {
      await expect(
        updateLocation(tenantId, '00000000-0000-0000-0000-000000000002', { name: '' })
      ).rejects.toThrow('name cannot be empty');
    });
  });

  describe('listLocations', () => {
    it('should accept empty filters', async () => {
      const result = await listLocations(tenantId, {});
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
      const result = await listLocations(tenantId, { page: 2, limit: 10 });
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
    });
  });
});
