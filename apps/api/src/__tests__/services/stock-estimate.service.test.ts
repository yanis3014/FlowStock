import {
  computeConfidenceLevel,
} from '../../services/stock-estimate.service';

// We test the pure functions directly and mock DB for the async ones

// Mock database
const mockQueryWithTenant = jest.fn();
jest.mock('../../database/connection', () => ({
  getDatabase: () => ({
    queryWithTenant: mockQueryWithTenant,
  }),
}));

// Mock getProductById
const mockGetProductById = jest.fn();
jest.mock('../../services/product.service', () => ({
  getProductById: (...args: unknown[]) => mockGetProductById(...args),
}));

// Import AFTER mocks are set up
import {
  getProductStockEstimate,
  getAllStockEstimates,
  getSalesAggregationForProduct,
  getSalesAggregationBatch,
} from '../../services/stock-estimate.service';

describe('stock-estimate.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // computeConfidenceLevel (pure function)
  // ==========================================================================
  describe('computeConfidenceLevel', () => {
    it('should return "high" for >= 20 distinct days', () => {
      expect(computeConfidenceLevel(20)).toBe('high');
      expect(computeConfidenceLevel(25)).toBe('high');
      expect(computeConfidenceLevel(30)).toBe('high');
    });

    it('should return "medium" for 7..19 distinct days', () => {
      expect(computeConfidenceLevel(7)).toBe('medium');
      expect(computeConfidenceLevel(12)).toBe('medium');
      expect(computeConfidenceLevel(19)).toBe('medium');
    });

    it('should return "low" for 1..6 distinct days', () => {
      expect(computeConfidenceLevel(1)).toBe('low');
      expect(computeConfidenceLevel(3)).toBe('low');
      expect(computeConfidenceLevel(6)).toBe('low');
    });

    it('should return "insufficient" for 0 distinct days', () => {
      expect(computeConfidenceLevel(0)).toBe('insufficient');
    });
  });

  // ==========================================================================
  // getSalesAggregationForProduct
  // ==========================================================================
  describe('getSalesAggregationForProduct', () => {
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const productId = '00000000-0000-0000-0000-000000000010';

    it('should return total_sold and distinct_days from DB', async () => {
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [{ total_sold: '150', distinct_days: '25' }],
      });

      const result = await getSalesAggregationForProduct(tenantId, productId, 30);
      expect(result).toEqual({ total_sold: 150, distinct_days: 25 });
      expect(mockQueryWithTenant).toHaveBeenCalledWith(
        tenantId,
        expect.stringContaining('SUM(quantity_sold)'),
        [productId, 30]
      );
    });

    it('should return 0 when no sales data', async () => {
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [{ total_sold: '0', distinct_days: '0' }],
      });

      const result = await getSalesAggregationForProduct(tenantId, productId, 30);
      expect(result).toEqual({ total_sold: 0, distinct_days: 0 });
    });
  });

  // ==========================================================================
  // getSalesAggregationBatch
  // ==========================================================================
  describe('getSalesAggregationBatch', () => {
    const tenantId = '00000000-0000-0000-0000-000000000001';

    it('should return a Map with sales data grouped by product_id', async () => {
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [
          { product_id: 'p1', total_sold: '100', distinct_days: '20' },
          { product_id: 'p2', total_sold: '50', distinct_days: '10' },
        ],
      });

      const result = await getSalesAggregationBatch(tenantId, 30);
      expect(result.size).toBe(2);
      expect(result.get('p1')).toEqual({ total_sold: 100, distinct_days: 20 });
      expect(result.get('p2')).toEqual({ total_sold: 50, distinct_days: 10 });
    });

    it('should return empty map when no sales', async () => {
      mockQueryWithTenant.mockResolvedValueOnce({ rows: [] });

      const result = await getSalesAggregationBatch(tenantId, 30);
      expect(result.size).toBe(0);
    });
  });

  // ==========================================================================
  // getProductStockEstimate
  // ==========================================================================
  describe('getProductStockEstimate', () => {
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const productId = '00000000-0000-0000-0000-000000000010';

    it('should return null if product not found', async () => {
      mockGetProductById.mockResolvedValueOnce(null);
      const result = await getProductStockEstimate(tenantId, productId);
      expect(result).toBeNull();
    });

    it('should calculate days_remaining correctly (stock 100, 150 sold in 30 days => 5/day => 20 days)', async () => {
      mockGetProductById.mockResolvedValueOnce({
        id: productId,
        name: 'Produit A',
        sku: 'SKU-A',
        quantity: 100,
        unit: 'piece',
      });
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [{ total_sold: '150', distinct_days: '25' }],
      });

      const result = await getProductStockEstimate(tenantId, productId, 30);
      expect(result).not.toBeNull();
      expect(result!.avg_daily_consumption).toBe(5); // 150/30
      expect(result!.days_remaining).toBe(20); // 100/5
      expect(result!.confidence_level).toBe('high'); // 25 distinct days
      expect(result!.estimated_stockout_date).not.toBeNull();
      expect(result!.period_days).toBe(30);
    });

    it('should return confidence medium for 12 distinct days', async () => {
      mockGetProductById.mockResolvedValueOnce({
        id: productId,
        name: 'Produit B',
        sku: 'SKU-B',
        quantity: 50,
        unit: 'kg',
      });
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [{ total_sold: '60', distinct_days: '12' }],
      });

      const result = await getProductStockEstimate(tenantId, productId, 30);
      expect(result!.confidence_level).toBe('medium');
    });

    it('should return confidence low for 3 distinct days', async () => {
      mockGetProductById.mockResolvedValueOnce({
        id: productId,
        name: 'Produit C',
        sku: 'SKU-C',
        quantity: 50,
        unit: 'piece',
      });
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [{ total_sold: '30', distinct_days: '3' }],
      });

      const result = await getProductStockEstimate(tenantId, productId, 30);
      expect(result!.confidence_level).toBe('low');
    });

    it('should return confidence insufficient and null consumption when 0 sales', async () => {
      mockGetProductById.mockResolvedValueOnce({
        id: productId,
        name: 'Produit D',
        sku: 'SKU-D',
        quantity: 50,
        unit: 'piece',
      });
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [{ total_sold: '0', distinct_days: '0' }],
      });

      const result = await getProductStockEstimate(tenantId, productId, 30);
      expect(result!.confidence_level).toBe('insufficient');
      expect(result!.avg_daily_consumption).toBeNull();
      expect(result!.days_remaining).toBeNull();
      expect(result!.estimated_stockout_date).toBeNull();
    });

    it('should return 0 days_remaining when stock is 0', async () => {
      mockGetProductById.mockResolvedValueOnce({
        id: productId,
        name: 'Produit E',
        sku: 'SKU-E',
        quantity: 0,
        unit: 'piece',
      });
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [{ total_sold: '100', distinct_days: '20' }],
      });

      const result = await getProductStockEstimate(tenantId, productId, 30);
      expect(result!.days_remaining).toBe(0);
      expect(result!.avg_daily_consumption).not.toBeNull();
    });

    it('should compute stockout date correctly', async () => {
      mockGetProductById.mockResolvedValueOnce({
        id: productId,
        name: 'Produit F',
        sku: 'SKU-F',
        quantity: 100,
        unit: 'piece',
      });
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [{ total_sold: '150', distinct_days: '25' }],
      });

      const result = await getProductStockEstimate(tenantId, productId, 30);
      expect(result!.estimated_stockout_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // The stockout date should be approximately 20 days from now
      const stockout = new Date(result!.estimated_stockout_date!);
      const now = new Date();
      const diffDays = (stockout.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeGreaterThan(18);
      expect(diffDays).toBeLessThan(22);
    });
  });

  // ==========================================================================
  // getAllStockEstimates
  // ==========================================================================
  describe('getAllStockEstimates', () => {
    const tenantId = '00000000-0000-0000-0000-000000000001';

    it('should return empty array when no products', async () => {
      // Products query
      mockQueryWithTenant.mockResolvedValueOnce({ rows: [] });

      const result = await getAllStockEstimates(tenantId, 30);
      expect(result).toEqual([]);
    });

    it('should return estimates for all active products sorted by urgency', async () => {
      // Products query
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [
          { id: 'p1', name: 'Low stock', sku: 'LS', quantity: '10', unit: 'piece' },
          { id: 'p2', name: 'High stock', sku: 'HS', quantity: '500', unit: 'piece' },
          { id: 'p3', name: 'No sales', sku: 'NS', quantity: '100', unit: 'piece' },
        ],
      });
      // Batch sales query
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [
          { product_id: 'p1', total_sold: '60', distinct_days: '20' },  // 2/day => 5 days
          { product_id: 'p2', total_sold: '30', distinct_days: '15' },  // 1/day => 500 days
          // p3 has no sales
        ],
      });

      const result = await getAllStockEstimates(tenantId, 30);
      expect(result).toHaveLength(3);

      // Sorted by days_remaining ASC, nulls last
      expect(result[0].product_id).toBe('p1'); // 5 days (most urgent)
      expect(result[0].days_remaining).toBe(5);
      expect(result[1].product_id).toBe('p2'); // 500 days
      expect(result[1].days_remaining).toBe(500);
      expect(result[2].product_id).toBe('p3'); // null (no sales)
      expect(result[2].days_remaining).toBeNull();
    });

    it('should use a single batch query for sales (no N+1)', async () => {
      // Products query
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [
          { id: 'p1', name: 'A', sku: 'A', quantity: '10', unit: 'piece' },
          { id: 'p2', name: 'B', sku: 'B', quantity: '20', unit: 'piece' },
        ],
      });
      // Batch sales query
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [
          { product_id: 'p1', total_sold: '30', distinct_days: '10' },
        ],
      });

      await getAllStockEstimates(tenantId, 30);

      // Only 2 DB calls: one for products, one for batch sales
      expect(mockQueryWithTenant).toHaveBeenCalledTimes(2);
    });

    it('should handle custom period_days', async () => {
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [{ id: 'p1', name: 'A', sku: 'A', quantity: '100', unit: 'piece' }],
      });
      mockQueryWithTenant.mockResolvedValueOnce({
        rows: [{ product_id: 'p1', total_sold: '70', distinct_days: '7' }],
      });

      const result = await getAllStockEstimates(tenantId, 7);
      expect(result[0].period_days).toBe(7);
      expect(result[0].avg_daily_consumption).toBe(10); // 70/7
      expect(result[0].days_remaining).toBe(10); // 100/10
    });
  });
});
