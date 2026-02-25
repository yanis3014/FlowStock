'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { DataTable, type DataTableColumn, type PaginationState } from '@/components/ui/DataTable';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

interface Sale {
  id: string;
  product_id: string;
  product_name?: string;
  sale_date: string;
  quantity_sold: number;
  unit_price: number | null;
  total_amount: number | null;
  location_id: string | null;
  location_name?: string | null;
  source: string;
  created_at: string;
}

interface ProductRef {
  id: string;
  name: string;
  sku?: string;
}

export default function SalesPage() {
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const router = useRouter();
  const [list, setList] = useState<Sale[]>([]);
  const [pagination, setPagination] = useState<PaginationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [productId, setProductId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [sortKey, setSortKey] = useState('sale_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [products, setProducts] = useState<ProductRef[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!token && !isLoading) {
      router.push('/login?returnUrl=/sales');
      return;
    }
  }, [token, isLoading, router]);

  const loadSales = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (productId) params.set('product_id', productId);
    if (locationId) params.set('location_id', locationId);
    params.set('sort', sortKey);
    params.set('order', sortOrder);

    fetchApi(`/sales?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Erreur chargement');
        return res.json();
      })
      .then((json) => {
        if (json?.success && json?.data) setList(json.data);
        else setError('Données invalides.');
        if (json?.pagination) setPagination(json.pagination);
      })
      .catch(() => setError('Erreur réseau.'))
      .finally(() => setLoading(false));
  }, [token, fetchApi, page, dateFrom, dateTo, productId, locationId, sortKey, sortOrder]);

  useEffect(() => {
    if (token) loadSales();
  }, [token, loadSales]);

  useEffect(() => {
    if (!token) return;
    fetchApi('/products?limit=500')
      .then((r) => r.ok ? r.json() : null)
      .then((j) => j?.success && j?.data && setProducts(j.data.map((p: { id: string; name: string; sku?: string }) => ({ id: p.id, name: p.name, sku: p.sku }))));
    fetchApi('/locations?limit=100')
      .then((r) => r.ok ? r.json() : null)
      .then((j) => j?.success && j?.data && setLocations(j.data.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name }))));
  }, [token, fetchApi]);

  const handleSort = useCallback((key: string) => {
    setSortKey(key);
    setSortOrder((o) => (sortKey === key ? (o === 'asc' ? 'desc' : 'asc') : 'desc'));
    setPage(1);
  }, [sortKey]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return s;
    }
  };

  const formatCurrency = (n: number | null) =>
    n != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n) : '—';

  const columns: DataTableColumn<Sale>[] = [
    { key: 'product_name', label: 'Produit', sortKey: 'sale_date', render: (s) => s.product_name ?? '—' },
    { key: 'quantity_sold', label: 'Quantité', sortKey: 'quantity_sold', render: (s) => String(s.quantity_sold) },
    { key: 'unit_price', label: 'Prix unitaire', sortKey: 'total_amount', render: (s) => formatCurrency(s.unit_price) },
    { key: 'total_amount', label: 'Montant', sortKey: 'total_amount', render: (s) => formatCurrency(s.total_amount) },
    { key: 'sale_date', label: 'Date', sortKey: 'sale_date', render: (s) => formatDate(s.sale_date) },
    { key: 'source', label: 'Source', render: (s) => s.source ?? '—' },
    { key: 'location_name', label: 'Emplacement', render: (s) => s.location_name ?? '—' },
  ];

  if (!token && isLoading) return null;
  if (!token) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Du</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Au</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Produit</label>
          <select
            value={productId}
            onChange={(e) => { setProductId(e.target.value); setPage(1); }}
            className="rounded border border-gray-300 px-3 py-2 text-sm min-w-[180px]"
          >
            <option value="">Tous</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Emplacement</label>
          <select
            value={locationId}
            onChange={(e) => { setLocationId(e.target.value); setPage(1); }}
            className="rounded border border-gray-300 px-3 py-2 text-sm min-w-[160px]"
          >
            <option value="">Tous</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : (
        <DataTable<Sale>
          columns={columns}
          data={list}
          getRowId={(s) => s.id}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={handleSort}
          pagination={pagination ?? undefined}
          onPageChange={handlePageChange}
          emptyMessage="Aucune vente"
        />
      )}
    </div>
  );
}
