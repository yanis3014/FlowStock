import { createProduct } from '../../services/product.service';

describe('product.service', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';

  describe('createProduct validation', () => {
    it('should throw when sku is missing', async () => {
      await expect(
        createProduct(tenantId, { sku: '', name: 'Product' })
      ).rejects.toThrow('SKU and name are required');
    });

    it('should throw when name is missing', async () => {
      await expect(
        createProduct(tenantId, { sku: 'SKU', name: '' })
      ).rejects.toThrow('SKU and name are required');
    });

    it('should throw when quantity is negative', async () => {
      await expect(
        createProduct(tenantId, { sku: 'SKU', name: 'Product', quantity: -1 })
      ).rejects.toThrow('Quantity must be >= 0');
    });

    it('should throw when min_quantity is negative', async () => {
      await expect(
        createProduct(tenantId, { sku: 'SKU', name: 'Product', min_quantity: -5 })
      ).rejects.toThrow('Min quantity must be >= 0');
    });

    it('should throw when unit is invalid', async () => {
      await expect(
        createProduct(tenantId, {
          sku: 'SKU',
          name: 'Product',
          unit: 'invalid_unit' as never,
        })
      ).rejects.toThrow('Invalid unit');
    });
  });
});
