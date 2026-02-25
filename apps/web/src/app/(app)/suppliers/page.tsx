'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  products_count?: number;
  created_at: string;
}

export default function SuppliersPage() {
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const router = useRouter();
  const [list, setList] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    if (!token && !isLoading) {
      router.push('/login?returnUrl=/suppliers');
      return;
    }
  }, [token, isLoading, router]);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    fetchApi('/suppliers?limit=100')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Erreur ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        if (json?.success && json?.data) setList(json.data);
        else setError('Données invalides.');
      })
      .catch((err: Error) => setError(err.message || 'Erreur réseau.'))
      .finally(() => setLoading(false));
  }, [token, fetchApi]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return list;
    const q = debouncedSearch.trim().toLowerCase();
    return list.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.contact_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
    );
  }, [list, debouncedSearch]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey as keyof Supplier];
      const bVal = b[sortKey as keyof Supplier];
      const cmp =
        aVal == null && bVal == null
          ? 0
          : aVal == null
            ? 1
            : bVal == null
              ? -1
              : String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortOrder]);

  const handleSort = useCallback((key: string) => {
    setSortKey(key);
    setSortOrder((o) => (sortKey === key ? (o === 'asc' ? 'desc' : 'asc') : 'asc'));
  }, [sortKey]);
  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Supprimer ce fournisseur ?')) return;
      const res = await fetchApi(`/suppliers/${id}`, { method: 'DELETE' });
      if (res.ok) load();
      else setError('Impossible de supprimer.');
    },
    [fetchApi, load]
  );

  const columns: DataTableColumn<Supplier>[] = [
    { key: 'name', label: 'Nom', sortKey: 'name', render: (s) => s.name },
    { key: 'contact_name', label: 'Contact', sortKey: 'contact_name', render: (s) => s.contact_name ?? '—' },
    { key: 'email', label: 'Email', sortKey: 'email', render: (s) => s.email ?? '—' },
    { key: 'phone', label: 'Téléphone', sortKey: 'phone', render: (s) => s.phone ?? '—' },
    {
      key: 'products_count',
      label: 'Produits',
      sortKey: 'products_count',
      render: (s) => (s.products_count != null ? String(s.products_count) : '—'),
    },
  ];

  if (!token && isLoading) return null;
  if (!token) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher par nom, contact, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm sm:w-64"
          />
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : (
        <DataTable<Supplier>
          columns={columns}
          data={sorted}
          getRowId={(s) => s.id}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={handleSort}
          emptyMessage="Aucun fournisseur"
          renderActions={(s) => (
            <button
              type="button"
              onClick={() => handleDelete(s.id)}
              className="rounded p-1.5 text-gray-500 hover:bg-error/10 hover:text-error"
              aria-label="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        />
      )}
    </div>
  );
}
