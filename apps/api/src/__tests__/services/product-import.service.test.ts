import {
  parseFile,
  suggestMapping,
  validateRow,
  getImportPreview,
  CSV_TEMPLATE,
} from '../../services/product-import.service';

describe('Product Import Service', () => {
  describe('parseFile', () => {
    it('should parse CSV with comma delimiter', () => {
      const csv = 'sku,name,quantity\nSKU1,Product 1,10\nSKU2,Product 2,20';
      const { headers, rows } = parseFile(Buffer.from(csv, 'utf-8'), 'test.csv');
      expect(headers).toEqual(['sku', 'name', 'quantity']);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual(['SKU1', 'Product 1', '10']);
      expect(rows[1]).toEqual(['SKU2', 'Product 2', '20']);
    });

    it('should parse CSV with semicolon delimiter', () => {
      const csv = 'sku;name;quantity\nSKU1;Product 1;10';
      const { headers, rows } = parseFile(Buffer.from(csv, 'utf-8'), 'test.csv');
      expect(headers).toEqual(['sku', 'name', 'quantity']);
      expect(rows[0]).toEqual(['SKU1', 'Product 1', '10']);
    });

    it('should prefer semicolon when more frequent than comma', () => {
      const csv = 'sku;name;qty;price,extra\nSKU1;Product 1;10;5.50,ignored';
      const { headers, rows } = parseFile(Buffer.from(csv, 'utf-8'), 'test.csv');
      expect(headers.length).toBeGreaterThan(2);
      expect(headers).toContain('sku');
    });

    it('should handle empty file', () => {
      const { headers, rows } = parseFile(Buffer.from('', 'utf-8'), 'empty.csv');
      expect(headers).toEqual([]);
      expect(rows).toEqual([]);
    });
  });

  describe('suggestMapping', () => {
    it('should map known column names', () => {
      const mapping = suggestMapping(['SKU', 'Nom', 'Quantité', 'prix_vente']);
      expect(mapping['SKU']).toBe('sku');
      expect(mapping['Nom']).toBe('name');
      expect(mapping['Quantité']).toBe('quantity');
      expect(mapping['prix_vente']).toBe('selling_price');
    });

    it('should handle ref and code as sku', () => {
      const mapping = suggestMapping(['ref', 'code']);
      expect(mapping['ref']).toBe('sku');
      expect(mapping['code']).toBe('sku');
    });
  });

  describe('validateRow', () => {
    const mapping = { sku: 'sku', name: 'name', quantity: 'quantity', unit: 'unit' };

    it('should validate correct row', () => {
      const row = { sku: 'SKU1', name: 'Product 1', quantity: '10', unit: 'piece' };
      const result = validateRow(row, mapping, 2);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.input.sku).toBe('SKU1');
        expect(result.input.name).toBe('Product 1');
        expect(result.input.quantity).toBe(10);
        expect(result.input.unit).toBe('piece');
      }
    });

    it('should reject row without sku', () => {
      const row = { sku: '', name: 'Product 1', quantity: '10', unit: 'piece' };
      const result = validateRow(row, mapping, 2);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toContain('SKU');
    });

    it('should reject row without name', () => {
      const row = { sku: 'SKU1', name: '', quantity: '10', unit: 'piece' };
      const result = validateRow(row, mapping, 2);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toContain('Name');
    });

    it('should reject negative quantity', () => {
      const row = { sku: 'SKU1', name: 'Product 1', quantity: '-5', unit: 'piece' };
      const result = validateRow(row, mapping, 2);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toContain('Quantity');
    });

    it('should normalize unit values', () => {
      const row = { sku: 'SKU1', name: 'Product 1', quantity: '10', unit: 'pc' };
      const result = validateRow(row, mapping, 2);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.input.unit).toBe('piece');
    });

    it('should normalize various unit aliases', () => {
      const testCases = [
        { input: 'pcs', expected: 'piece' },
        { input: 'kilo', expected: 'kg' },
        { input: 'litre', expected: 'liter' },
        { input: 'l', expected: 'liter' },
        { input: 'boxes', expected: 'box' },
        { input: 'packs', expected: 'pack' },
      ];
      testCases.forEach(({ input, expected }) => {
        const row = { sku: 'SKU1', name: 'Product 1', quantity: '10', unit: input };
        const result = validateRow(row, mapping, 2);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.input.unit).toBe(expected);
      });
    });

    it('should handle empty unit and default to piece', () => {
      const row = { sku: 'SKU1', name: 'Product 1', quantity: '10', unit: '' };
      const result = validateRow(row, mapping, 2);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.input.unit).toBe('piece');
    });
  });

  describe('getImportPreview', () => {
    it('should return columns, sample rows and suggested mapping', () => {
      const csv = 'sku,name,quantity\nSKU1,Product 1,10\nSKU2,Product 2,20\nSKU3,Product 3,30';
      const preview = getImportPreview(Buffer.from(csv, 'utf-8'), 'test.csv');
      expect(preview.columns).toEqual(['sku', 'name', 'quantity']);
      expect(preview.sampleRows).toHaveLength(3);
      expect(preview.sampleRows[0]).toEqual({ sku: 'SKU1', name: 'Product 1', quantity: '10' });
      expect(preview.suggestedMapping).toEqual({ sku: 'sku', name: 'name', quantity: 'quantity' });
    });
  });

  describe('CSV_TEMPLATE', () => {
    it('should contain expected headers', () => {
      expect(CSV_TEMPLATE).toContain('sku,name,description,unit,quantity');
      expect(CSV_TEMPLATE).toContain('SKU001');
    });
  });
});
