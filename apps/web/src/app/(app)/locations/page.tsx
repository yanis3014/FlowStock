'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

interface Location {
  id: string;
  name: string;
  address: string | null;
  location_type: string | null;
  is_active: boolean;
  total_quantity?: number;
  created_at: string;
}

export default function LocationsPage() {
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const router = useRouter();
  const [list, setList] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    if (!token && !isLoading) {
      router.push('/login?returnUrl=/locations');
      return;
    }
  }, [token, isLoading, router]);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    fetchApi('/locations?limit=200')
      .then((res) => {
        if (!res.ok) throw new Error('Erreur chargement');
        return res.json();
      })
      .then((json) => {
        if (json?.success && json?.data) setList(json.data);
        else setError('Données invalides.');
      })
      .catch(() => setError('Erreur réseau.'))
      .finally(() => setLoading(false));
  }, [token, fetchApi]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return list;
    const q = debouncedSearch.trim().toLowerCase();
    return list.filter(
      (l) =>
        l.name?.toLowerCase().includes(q) ||
        (l.address?.toLowerCase().includes(q) ?? false)
    );
  }, [list, debouncedSearch]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey as keyof Location];
      const bVal = b[sortKey as keyof Location];
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
      if (!window.confirm('Supprimer cet emplacement ?')) return;
      const res = await fetchApi(`/locations/${id}`, { method: 'DELETE' });
      if (res.ok) load();
      else setError('Impossible de supprimer.');
    },
    [fetchApi, load]
  );

  const columns: DataTableColumn<Location>[] = [
    { key: 'name', label: 'Nom', sortKey: 'name', render: (l) => l.name },
    { key: 'address', label: 'Adresse', sortKey: 'address', render: (l) => l.address ?? '—' },
    { key: 'location_type', label: 'Type', sortKey: 'location_type', render: (l) => l.location_type ?? '—' },
    {
      key: 'total_quantity',
      label: 'Quantité totale',
      sortKey: 'total_quantity',
      render: (l) => (l.total_quantity != null ? new Intl.NumberFormat('fr-FR').format(l.total_quantity) : '—'),
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
            placeholder="Rechercher par nom ou adresse…"
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
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <DataTable<Location>
          columns={columns}
          data={sorted}
          getRowId={(l) => l.id}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={handleSort}
          emptyMessage="Aucun emplacement"
          renderActions={(l) => (
            <button
              type="button"
              onClick={() => handleDelete(l.id)}
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
