/**
 * Shared sales-related utilities (used by sales.service and sales-import.service)
 */
export function computeTotalAmount(
  quantitySold: number,
  unitPrice: number | null | undefined
): number | null {
  if (unitPrice == null || unitPrice < 0) return null;
  return Math.round(quantitySold * unitPrice * 100) / 100;
}
