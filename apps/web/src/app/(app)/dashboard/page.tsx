'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Package, AlertTriangle, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

interface SalesYesterday {
  total_amount?: number;
  transaction_count?: number;
  change_percent?: number | null;
}

interface CurrentStock {
  total_value?: number;
  product_count?: number;
  low_stock_count?: number;
  critical_stock_count?: number;
}

interface DashboardAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  product?: { id: string; name: string };
  message: string;
  created_at?: string;
}

interface DashboardSummary {
  sales_yesterday?: SalesYesterday;
  current_stock?: CurrentStock;
  alerts?: DashboardAlert[];
  pending_orders?: number;
  pending_invoices?: number;
}

function formatNumber(val: number | undefined): string {
  if (val == null) return '—';
  return new Intl.NumberFormat('fr-FR').format(val);
}

function formatCurrency(val: number | undefined): string {
  if (val == null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export default function DashboardPage() {
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionStates, setActionStates] = useState<Record<string, 'idle' | 'loading' | 'confirmed'>>({});

  useEffect(() => {
    if (!token && !isLoading) {
      router.push('/login?returnUrl=/dashboard');
      return;
    }
  }, [token, isLoading, router]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    fetchApi('/dashboard/summary')
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError('Erreur lors du chargement.');
          return;
        }
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (json?.success && json?.data) {
          setSummary(json.data);
        } else {
          setError('Données invalides.');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Erreur réseau.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, fetchApi]);

  const handleCommander = useCallback(
    async (alertId: string) => {
      setActionStates((s) => ({ ...s, [alertId]: 'loading' }));
      await new Promise((r) => setTimeout(r, 800));
      setActionStates((s) => ({ ...s, [alertId]: 'confirmed' }));
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!token) {
    return null;
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  const sales = summary?.sales_yesterday ?? {};
  const stock = summary?.current_stock ?? {};
  const alerts = summary?.alerts ?? [];

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">
          {error}
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-sm font-medium text-gray-600">Ventes hier</h2>
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-800">
                {formatCurrency(sales.total_amount)}
              </p>
              {sales.transaction_count != null && (
                <p className="mt-1 text-sm text-gray-500">
                  {formatNumber(sales.transaction_count)} vente{sales.transaction_count !== 1 ? 's' : ''}
                </p>
              )}
              {sales.change_percent != null && (
                <p
                  className={`mt-1 text-sm font-medium ${
                    sales.change_percent >= 0 ? 'text-success' : 'text-error'
                  }`}
                >
                  {(sales.change_percent >= 0 ? '+' : '')}
                  {sales.change_percent.toFixed(1)}%
                </p>
              )}
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-success/10 p-2">
                  <Package className="h-5 w-5 text-success" />
                </div>
                <h2 className="text-sm font-medium text-gray-600">Stock actuel</h2>
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-800">
                {formatCurrency(stock.total_value)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {formatNumber(stock.product_count)} produit{(stock.product_count ?? 0) !== 1 ? 's' : ''}
              </p>
              {((stock.low_stock_count ?? 0) > 0 || (stock.critical_stock_count ?? 0) > 0) && (
                <p className="mt-1 text-sm">
                  <span className="text-warning">{formatNumber(stock.low_stock_count)} faible</span>
                  <span className="mx-1 text-gray-400">•</span>
                  <span className="text-error">{formatNumber(stock.critical_stock_count)} critique</span>
                </p>
              )}
            </div>
          </div>

          {alerts.length > 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-md bg-warning/10 p-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <h2 className="text-sm font-medium text-gray-600">Alertes</h2>
              </div>
              <ul className="space-y-2">
                {alerts.map((a) => {
                  const state = actionStates[a.id] ?? 'idle';
                  const levelClass =
                    a.severity === 'high'
                      ? 'border-l-error bg-error/5'
                      : a.severity === 'medium'
                        ? 'border-l-warning bg-warning/5'
                        : 'border-l-gray-400 bg-gray-50';
                  return (
                    <li
                      key={a.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-md border-l-4 p-3 text-sm ${levelClass}`}
                    >
                      <span
                        className={
                          a.severity === 'high'
                            ? 'font-medium text-error'
                            : a.severity === 'medium'
                              ? 'font-medium text-warning'
                              : 'text-gray-700'
                        }
                      >
                        {a.message}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCommander(a.id)}
                        disabled={state === 'loading' || state === 'confirmed'}
                        className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                          state === 'confirmed'
                            ? 'bg-success/20 text-success'
                            : 'bg-primary text-white hover:bg-primary/90 disabled:opacity-80'
                        }`}
                      >
                        {state === 'loading' && (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        )}
                        {state === 'confirmed' && (
                          <Check className="h-4 w-4" aria-hidden />
                        )}
                        {state === 'idle' && 'Commander'}
                        {state === 'loading' && 'En cours…'}
                        {state === 'confirmed' && 'Demandé'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            !error && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
                <p className="text-gray-500">Aucune alerte de stock.</p>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
