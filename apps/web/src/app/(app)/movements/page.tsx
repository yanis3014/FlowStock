'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { History, Download, Loader2, Info } from 'lucide-react';
import type { Product, StockMovement, MovementType } from '@bmad/shared';
import { PageHeader } from '@/components/ui/PageHeader';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient';

interface StockEstimate {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  unit: string;
  avg_daily_consumption: number | null;
  days_remaining: number | null;
  estimated_stockout_date: string | null;
  confidence_level: ConfidenceLevel;
  sales_days_count: number;
  period_days: number;
}

const ESTIMATE_BASIC_MESSAGE =
  'Estimation basique à partir des ventes des 30 derniers jours. La précision s\'améliorera avec les prédictions IA (niveau Premium).';

function confidenceLabel(level: ConfidenceLevel): string {
  if (level === 'insufficient') return 'Pas assez de données de ventes';
  if (level === 'low') return 'Estimation peu fiable';
  return '';
}

function confidenceBadgeClass(level: ConfidenceLevel): string {
  if (level === 'insufficient') return 'bg-red-alert/15 text-red-alert border-red-alert/30';
  if (level === 'low') return 'bg-orange-warn/15 text-orange-warn border-orange-warn/30';
  return '';
}

const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  creation: 'Création',
  quantity_update: 'Modification qté',
  deletion: 'Suppression',
  import: 'Import',
  pos_sale: 'Vente POS',
  loss: 'Perte',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

export default function MovementsPage() {
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const searchParams = useSearchParams();
  const productIdFromUrl = searchParams.get('product_id');
  const validProductIdFromUrl =
    productIdFromUrl && isValidUuid(productIdFromUrl) ? productIdFromUrl : null;

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(validProductIdFromUrl ?? '');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<MovementType | ''>('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportTruncated, setExportTruncated] = useState(false);
  const [stockEstimate, setStockEstimate] = useState<StockEstimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  useEffect(() => {
    if (validProductIdFromUrl && !selectedProductId) setSelectedProductId(validProductIdFromUrl);
  }, [validProductIdFromUrl, selectedProductId]);

  const loadProducts = useCallback(() => {
    if (!token) return;
    setLoadingProducts(true);
    setError('');
    fetchApi('/products?limit=200')
      .then((res) => {
        if (!res.ok) throw new Error('Erreur chargement des produits');
        return res.json();
      })
      .then((json) => {
        if (json?.success && json?.data) setProducts(json.data);
        else setProducts([]);
      })
      .catch(() => {
        setError('Impossible de charger les produits.');
        setProducts([]);
      })
      .finally(() => setLoadingProducts(false));
  }, [token, fetchApi]);

  useEffect(() => {
    if (
      loadingProducts ||
      !token ||
      !validProductIdFromUrl ||
      products.some((p) => p.id === validProductIdFromUrl)
    )
      return;
    fetchApi(`/products/${validProductIdFromUrl}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && json?.data) {
          setProducts((prev) =>
            prev.some((p) => p.id === json.data.id) ? prev : [...prev, json.data]
          );
        }
      })
      .catch(() => {});
  }, [loadingProducts, token, fetchApi, validProductIdFromUrl, products]);

  useEffect(() => {
    if (token) loadProducts();
  }, [token, loadProducts]);

  useEffect(() => {
    if (!token || !selectedProductId) {
      setStockEstimate(null);
      return;
    }
    setLoadingEstimate(true);
    setStockEstimate(null);
    fetchApi(`/stock-estimates/${selectedProductId}?period_days=30`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && json?.data) setStockEstimate(json.data);
        else setStockEstimate(null);
      })
      .catch(() => setStockEstimate(null))
      .finally(() => setLoadingEstimate(false));
  }, [token, fetchApi, selectedProductId]);

  const loadMovements = useCallback(() => {
    if (!token || !selectedProductId) return;
    if (filterUserId.trim() && !isValidUuid(filterUserId)) {
      setError('Identifiant utilisateur invalide (format UUID attendu).');
      return;
    }
    setLoadingMovements(true);
    setError('');
    const params = new URLSearchParams();
    params.set('page', String(pagination.page));
    params.set('limit', String(pagination.limit));
    if (filterType) params.set('movement_type', filterType);
    if (filterUserId.trim()) params.set('user_id', filterUserId.trim());
    if (filterDateFrom) params.set('date_from', filterDateFrom);
    if (filterDateTo) params.set('date_to', filterDateTo);
    fetchApi(`/products/${selectedProductId}/movements?${params.toString()}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            res.status === 400 && json?.errors?.some((e: { param?: string }) => e.param === 'user_id')
              ? 'Identifiant utilisateur invalide (format UUID attendu).'
              : json?.error ?? 'Erreur chargement des mouvements';
          throw new Error(msg);
        }
        return json;
      })
      .then((json) => {
        if (json?.success && json?.data) {
          setMovements(json.data);
          if (json.pagination) {
            setPagination((p) => ({
              ...p,
              total: json.pagination.total ?? 0,
              total_pages: json.pagination.total_pages ?? 0,
            }));
          }
          setRetentionDays(json.retention_days ?? null);
        } else setMovements([]);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Impossible de charger les mouvements.');
        setMovements([]);
      })
      .finally(() => setLoadingMovements(false));
  }, [token, fetchApi, selectedProductId, pagination.page, pagination.limit, filterType, filterUserId, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (selectedProductId && token) {
      setPagination((p) => ({ ...p, page: 1 }));
      setExportTruncated(false);
    } else {
      setMovements([]);
      setRetentionDays(null);
    }
  }, [selectedProductId, token]);

  useEffect(() => {
    setExportTruncated(false);
  }, [filterType, filterUserId, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (selectedProductId && token) loadMovements();
  }, [selectedProductId, token, pagination.page, filterType, filterUserId, filterDateFrom, filterDateTo, loadMovements]);

  const handleExportCsv = useCallback(async () => {
    if (!selectedProductId || !token) return;
    if (filterUserId.trim() && !isValidUuid(filterUserId)) {
      setError('Identifiant utilisateur invalide (format UUID attendu).');
      return;
    }
    setExportLoading(true);
    setExportTruncated(false);
    setError('');
    const params = new URLSearchParams();
    params.set('format', 'csv');
    if (filterType) params.set('movement_type', filterType);
    if (filterUserId.trim()) params.set('user_id', filterUserId.trim());
    if (filterDateFrom) params.set('date_from', filterDateFrom);
    if (filterDateTo) params.set('date_to', filterDateTo);
    try {
      const res = await fetchApi(`/products/${selectedProductId}/movements/export?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const msg =
          res.status === 400 && json?.errors?.some((e: { param?: string }) => e.param === 'user_id')
            ? 'Identifiant utilisateur invalide (format UUID attendu).'
            : json?.error ?? 'Export impossible';
        throw new Error(msg);
      }
      const blob = await res.blob();
      const truncated = res.headers.get('X-Export-Truncated') === 'true';
      setExportTruncated(truncated);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movements-${selectedProductId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export CSV impossible.');
    } finally {
      setExportLoading(false);
    }
  }, [selectedProductId, token, fetchApi, filterType, filterUserId, filterDateFrom, filterDateTo]);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  if (!token && isLoading) return null;
  if (!token) return null;

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-6xl space-y-6 p-6 pb-24 md:pb-6">
        {error && (
          <div className="rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
            {error}
          </div>
        )}

        <PageHeader
          title="Historique des mouvements"
          subtitle="Consultez les mouvements de stock par produit"
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-charcoal/60 mb-1.5">Produit</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
            >
              <option value="">Sélectionner un produit…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedProductId && (
          <>
            {/* Bloc Estimation temps de stock */}
            <div className="rounded-xl border border-charcoal/8 bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-display text-sm font-bold text-charcoal">Estimation temps de stock</h3>
              {loadingEstimate ? (
                <div className="flex items-center gap-2 text-sm text-charcoal/50">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span>Chargement…</span>
                </div>
              ) : stockEstimate ? (
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-4">
                    <span className="text-charcoal">
                      <strong>Consommation moy. 30 j :</strong>{' '}
                      {stockEstimate.avg_daily_consumption != null
                        ? `${stockEstimate.avg_daily_consumption.toFixed(2)} ${stockEstimate.unit}/jour`
                        : '—'}
                    </span>
                    <span className="text-charcoal">
                      <strong>Jours restants :</strong>{' '}
                      {stockEstimate.days_remaining != null ? `${stockEstimate.days_remaining} j` : '—'}
                    </span>
                    <span className="text-charcoal">
                      <strong>Unité :</strong> {stockEstimate.unit}
                    </span>
                  </div>
                  {(stockEstimate.confidence_level === 'low' || stockEstimate.confidence_level === 'insufficient') && (
                    <p>
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${confidenceBadgeClass(stockEstimate.confidence_level)}`}
                        role="status"
                        aria-label={confidenceLabel(stockEstimate.confidence_level)}
                      >
                        {confidenceLabel(stockEstimate.confidence_level)}
                      </span>
                    </p>
                  )}
                  <p className="flex items-start gap-2 text-xs text-charcoal/60" role="note" aria-label={ESTIMATE_BASIC_MESSAGE}>
                    <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                    <span>{ESTIMATE_BASIC_MESSAGE}</span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-charcoal/50">Aucune estimation disponible pour ce produit.</p>
              )}
            </div>

            {retentionDays != null && (
              <p className="text-sm text-charcoal/50">
                Historique affiché : {retentionDays} derniers jours (selon votre abonnement)
              </p>
            )}

            <div className="flex flex-wrap gap-3 bg-white border border-charcoal/8 rounded-xl p-4 shadow-sm">
              <div>
                <label className="block text-xs font-medium text-charcoal/60 mb-1.5">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value as MovementType | '');
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                >
                  <option value="">Tous</option>
                  {(Object.keys(MOVEMENT_TYPE_LABELS) as MovementType[]).map((t) => (
                    <option key={t} value={t}>
                      {MOVEMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal/60 mb-1.5">Utilisateur (UUID)</label>
                <input
                  type="text"
                  placeholder="Filtrer par user_id…"
                  value={filterUserId}
                  onChange={(e) => {
                    setFilterUserId(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal/60 mb-1.5">Date début</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal/60 mb-1.5">Date fin</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => loadMovements()}
                  className="px-4 py-2 bg-green-deep text-cream rounded-lg text-sm font-medium hover:bg-forest-green transition-colors"
                >
                  Filtrer
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={exportLoading || !selectedProductId}
                  className="inline-flex items-center gap-2 border border-charcoal/20 text-charcoal px-4 py-2 rounded-lg text-sm font-medium hover:bg-charcoal/5 disabled:opacity-50 transition-colors"
                >
                  {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Exporter CSV
                </button>
              </div>
            </div>

            {exportTruncated && (
              <p className="text-sm text-gold">L&apos;export a été limité à 10 000 lignes.</p>
            )}

            <div className="overflow-x-auto rounded-xl border border-charcoal/8 bg-white shadow-sm">
              {loadingMovements ? (
                <TableSkeleton rows={8} cols={6} />
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-charcoal/8 bg-cream/50">
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-charcoal/50">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-charcoal/50">Type</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-charcoal/50">Utilisateur</th>
                      <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-charcoal/50">Ancienne qté</th>
                      <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-charcoal/50">Nouvelle qté</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-charcoal/50">Raison</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal/5">
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-sm text-charcoal/40">
                          Aucun mouvement pour ce produit.
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => (
                        <tr key={m.id} className="hover:bg-cream/30 transition-colors">
                          <td className="px-5 py-4 text-sm text-charcoal">{formatDate(m.created_at)}</td>
                          <td className="px-5 py-4 text-sm text-charcoal">
                            {MOVEMENT_TYPE_LABELS[m.movement_type] ?? m.movement_type}
                          </td>
                          <td className="px-5 py-4 text-sm text-charcoal/50">{m.user_email ?? m.user_id ?? '—'}</td>
                          <td className="px-5 py-4 text-right text-sm text-charcoal">
                            {m.quantity_before != null ? m.quantity_before : '—'}
                          </td>
                          <td className="px-5 py-4 text-right text-sm text-charcoal">
                            {m.quantity_after != null ? m.quantity_after : '—'}
                          </td>
                          <td className="px-5 py-4 text-sm text-charcoal/50">{m.reason ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                  disabled={pagination.page <= 1}
                  className="rounded-lg border border-charcoal/15 px-3 py-1.5 text-charcoal disabled:opacity-50 hover:bg-cream/50 transition-colors"
                >
                  Préc.
                </button>
                <span className="text-charcoal/50">
                  Page {pagination.page} / {pagination.total_pages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPagination((p) => ({
                      ...p,
                      page: Math.min(p.total_pages, p.page + 1),
                    }))
                  }
                  disabled={pagination.page >= pagination.total_pages}
                  className="rounded-lg border border-charcoal/15 px-3 py-1.5 text-charcoal disabled:opacity-50 hover:bg-cream/50 transition-colors"
                >
                  Suiv.
                </button>
              </div>
            )}
          </>
        )}

        {!selectedProductId && (
          <div className="flex items-center justify-center rounded-xl border border-charcoal/8 bg-white py-16 shadow-sm">
            <div className="text-center">
              <History className="mx-auto h-10 w-10 text-charcoal/25" />
              <p className="mt-3 font-display font-bold text-charcoal">Sélectionnez un produit</p>
              <p className="mt-1 text-sm text-charcoal/50">Choisissez un produit pour afficher son historique.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
