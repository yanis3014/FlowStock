'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { History, Download, Loader2 } from 'lucide-react';
import type { Product, StockMovement, MovementType } from '@bmad/shared';

const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  creation: 'Création',
  quantity_update: 'Modification qté',
  deletion: 'Suppression',
  import: 'Import',
  pos_sale: 'Vente POS',
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
      <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:pb-6">
        {error && (
          <div className="rounded-xl border border-red-alert/30 bg-red-alert/10 px-4 py-3 text-sm text-red-alert">
            {error}
          </div>
        )}

        <div>
          <h1 className="font-display text-2xl font-bold text-green-deep">Historique des mouvements</h1>
          <p className="text-sm text-gray-warm">Consultez les mouvements de stock par produit</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-warm">Produit</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-green-deep/20 bg-white px-4 py-2.5 text-sm text-charcoal"
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
            {retentionDays != null && (
              <p className="text-sm text-gray-warm">
                Historique affiché : {retentionDays} derniers jours (selon votre abonnement)
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-warm">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value as MovementType | '');
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="mt-1 rounded-xl border border-green-deep/20 bg-white px-4 py-2.5 text-sm text-charcoal"
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
                <label className="block text-xs font-semibold text-gray-warm">Utilisateur (UUID)</label>
                <input
                  type="text"
                  placeholder="Filtrer par user_id…"
                  value={filterUserId}
                  onChange={(e) => {
                    setFilterUserId(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="mt-1 rounded-xl border border-green-deep/20 bg-white px-4 py-2.5 text-sm text-charcoal placeholder-gray-warm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-warm">Date début</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="mt-1 rounded-xl border border-green-deep/20 bg-white px-4 py-2.5 text-sm text-charcoal"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-warm">Date fin</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="mt-1 rounded-xl border border-green-deep/20 bg-white px-4 py-2.5 text-sm text-charcoal"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => loadMovements()}
                  className="rounded-xl bg-green-deep/10 px-4 py-2.5 font-display text-sm font-bold text-green-deep"
                >
                  Filtrer
                </button>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={exportLoading || !selectedProductId}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-green-mid bg-transparent px-4 py-2.5 font-display text-sm font-bold text-green-deep disabled:opacity-50"
                >
                  {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Exporter CSV
                </button>
              </div>
            </div>

            {exportTruncated && (
              <p className="text-sm text-orange-warn">L&apos;export a été limité à 10 000 lignes.</p>
            )}

            <div className="overflow-x-auto rounded-2xl border border-green-deep/10 bg-white shadow-sm">
              {loadingMovements ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-green-mid" />
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-cream-dark bg-green-deep/5">
                      <th className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                        Utilisateur
                      </th>
                      <th className="px-4 py-3 text-right font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                        Ancienne qté
                      </th>
                      <th className="px-4 py-3 text-right font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                        Nouvelle qté
                      </th>
                      <th className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                        Raison
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-warm">
                          Aucun mouvement pour ce produit.
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-cream-dark last:border-0 hover:bg-cream/50"
                        >
                          <td className="px-4 py-3 text-sm text-charcoal">{formatDate(m.created_at)}</td>
                          <td className="px-4 py-3 text-sm text-charcoal">
                            {MOVEMENT_TYPE_LABELS[m.movement_type] ?? m.movement_type}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-warm">{m.user_email ?? m.user_id ?? '—'}</td>
                          <td className="px-4 py-3 text-right text-sm text-charcoal">
                            {m.quantity_before != null ? m.quantity_before : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-charcoal">
                            {m.quantity_after != null ? m.quantity_after : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-warm">{m.reason ?? '—'}</td>
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
                  className="rounded border border-green-deep/20 px-3 py-1 disabled:opacity-50"
                >
                  Préc.
                </button>
                <span className="text-gray-warm">
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
                  className="rounded border border-green-deep/20 px-3 py-1 disabled:opacity-50"
                >
                  Suiv.
                </button>
              </div>
            )}
          </>
        )}

        {!selectedProductId && (
          <div className="flex items-center justify-center rounded-2xl border border-green-deep/10 bg-white py-16">
            <div className="text-center">
              <History className="mx-auto h-12 w-12 text-green-deep/40" />
              <p className="mt-2 text-sm text-gray-warm">Sélectionnez un produit pour afficher son historique.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
