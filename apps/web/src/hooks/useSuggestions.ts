'use client';

import { useEffect, useState, useCallback } from 'react';
import { useApi } from './useApi';
import { useAuth } from '@/contexts/AuthContext';
import type { Product } from '@bmad/shared';

export interface Suggestion {
  id: string;
  type: 'restock' | 'overstock' | 'expiry';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  productId?: string;
  productName?: string;
  currentQty?: number;
  threshold?: number;
  unit?: string;
}

export function useSuggestions() {
  const { token } = useAuth();
  const { fetchApi } = useApi();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/products?limit=100&low_stock=true');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? 'Erreur lors du chargement.');
        setSuggestions([]);
        return;
      }
      const products: Product[] = json?.success && Array.isArray(json?.data) ? json.data : [];
      const restockSuggestions: Suggestion[] = products
        .filter((p) => p.stock_status === 'low' || p.stock_status === 'critical')
        .map((p) => {
          const threshold = p.min_quantity ?? 0;
          const isCritical = p.stock_status === 'critical' || p.quantity <= 0;
          const priority: 'high' | 'medium' | 'low' = isCritical
            ? 'high'
            : p.quantity < threshold * 0.5
              ? 'high'
              : 'medium';
          return {
            id: `restock-${p.id}`,
            type: 'restock',
            priority,
            title: `Réapprovisionner ${p.name}`,
            description: `Stock actuel : ${p.quantity} ${p.unit}. Seuil d'alerte : ${threshold} ${p.unit}.`,
            productId: p.id,
            productName: p.name,
            currentQty: p.quantity,
            threshold,
            unit: p.unit,
          };
        });
      setSuggestions(restockSuggestions);
    } catch {
      setError('Impossible de charger les suggestions.');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [token, fetchApi]);

  useEffect(() => {
    load();
  }, [load]);

  return { suggestions, loading, error, refetch: load };
}
