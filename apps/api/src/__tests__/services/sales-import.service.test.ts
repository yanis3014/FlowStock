import {
  parseFile,
  suggestMapping,
  getImportPreview,
  CSV_TEMPLATE,
} from '../../services/sales-import.service';

describe('Sales Import Service', () => {
  describe('parseFile', () => {
    it('should parse CSV with comma delimiter', () => {
      const csv = 'sale_date,product_sku,quantity_sold,unit_price\n2024-01-15,SKU1,5,12.50\n2024-01-16,SKU2,3,8.00';
      const { headers, rows } = parseFile(Buffer.from(csv, 'utf-8'), 'test.csv');
      expect(headers).toEqual(['sale_date', 'product_sku', 'quantity_sold', 'unit_price']);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual(['2024-01-15', 'SKU1', '5', '12.50']);
      expect(rows[1]).toEqual(['2024-01-16', 'SKU2', '3', '8.00']);
    });

    it('should parse CSV with semicolon delimiter', () => {
      const csv = 'sale_date;product_sku;quantity_sold;unit_price\n2024-01-15;SKU1;5;12.50';
      const { headers, rows } = parseFile(Buffer.from(csv, 'utf-8'), 'test.csv');
      expect(headers).toEqual(['sale_date', 'product_sku', 'quantity_sold', 'unit_price']);
      expect(rows[0]).toEqual(['2024-01-15', 'SKU1', '5', '12.50']);
    });

    it('should handle empty file', () => {
      const { headers, rows } = parseFile(Buffer.from('', 'utf-8'), 'empty.csv');
      expect(headers).toEqual([]);
      expect(rows).toEqual([]);
    });
  });

  describe('suggestMapping', () => {
    it('should map known column names', () => {
      const mapping = suggestMapping(['date', 'SKU', 'Quantité', 'prix']);
      expect(mapping['date']).toBe('sale_date');
      expect(mapping['SKU']).toBe('product_sku');
      expect(mapping['Quantité']).toBe('quantity_sold');
      expect(mapping['prix']).toBe('unit_price');
    });

    it('should handle various date column names', () => {
      const mapping = suggestMapping(['date de vente', 'vente_date', 'sale_date']);
      expect(mapping['date de vente']).toBe('sale_date');
      expect(mapping['vente_date']).toBe('sale_date');
      expect(mapping['sale_date']).toBe('sale_date');
    });

    it('should handle product column aliases', () => {
      const mapping = suggestMapping(['product', 'produit', 'code', 'ref']);
      expect(mapping['product']).toBe('product_sku');
      expect(mapping['produit']).toBe('product_sku');
      expect(mapping['code']).toBe('product_sku');
      expect(mapping['ref']).toBe('product_sku');
    });

    it('should handle location column names', () => {
      const mapping = suggestMapping(['location', 'emplacement', 'location_name']);
      expect(mapping['location']).toBe('location_name');
      expect(mapping['emplacement']).toBe('location_name');
      expect(mapping['location_name']).toBe('location_name');
    });
  });

  describe('getImportPreview', () => {
    it('should return preview with columns, sample rows, and suggested mapping', () => {
      const csv = 'sale_date,product_sku,quantity_sold\n2024-01-15,SKU1,5\n2024-01-16,SKU2,3';
      const preview = getImportPreview(Buffer.from(csv, 'utf-8'), 'test.csv');
      expect(preview.columns).toEqual(['sale_date', 'product_sku', 'quantity_sold']);
      expect(preview.sampleRows).toHaveLength(2);
      expect(preview.suggestedMapping).toBeDefined();
      expect(preview.suggestedMapping['sale_date']).toBe('sale_date');
      expect(preview.suggestedMapping['product_sku']).toBe('product_sku');
    });
  });

  describe('CSV_TEMPLATE', () => {
    it('should contain expected headers', () => {
      expect(CSV_TEMPLATE).toContain('sale_date');
      expect(CSV_TEMPLATE).toContain('product_sku');
      expect(CSV_TEMPLATE).toContain('quantity_sold');
      expect(CSV_TEMPLATE).toContain('unit_price');
      expect(CSV_TEMPLATE).toContain('location_name');
    });
  });
});
