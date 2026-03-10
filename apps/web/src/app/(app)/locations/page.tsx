'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, Plus, Pencil, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import type { Location, LocationCreateInput, LocationUpdateInput } from '@bmad/shared';

const emptyForm = {
  name: '',
  address: '',
  location_type: '',
};

export default function LocationsPage() {
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const router = useRouter();
  const [list, setList] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageSuccess, setMessageSuccess] = useState('');
  const [messageError, setMessageError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [modalOpen, setModalOpen] = useState<'create' | 'edit' | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
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
    fetchApi('/locations?limit=100&is_active=true')
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

  const openCreate = () => {
    setEditingLocation(null);
    setForm(emptyForm);
    setModalOpen('create');
    setMessageError('');
  };

  const openEdit = async (loc: Location) => {
    setMessageError('');
    try {
      const res = await fetchApi(`/locations/${loc.id}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMessageError(j?.error ?? 'Impossible de charger l\'emplacement.');
        return;
      }
      const json = await res.json();
      const fresh = json?.success && json?.data ? json.data : loc;
      setEditingLocation(fresh);
      setForm({
        name: fresh.name,
        address: fresh.address ?? '',
        location_type: fresh.location_type ?? '',
      });
      setModalOpen('edit');
    } catch {
      setMessageError('Erreur réseau.');
    }
  };

  const closeModal = () => {
    setModalOpen(null);
    setEditingLocation(null);
    setForm(emptyForm);
    setMessageError('');
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return 'Le nom est obligatoire.';
    return null;
  };

  const handleSubmitCreate = async () => {
    const err = validateForm();
    if (err) {
      setMessageError(err);
      return;
    }
    setSubmitLoading(true);
    setMessageError('');
    const body: LocationCreateInput = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      location_type: form.location_type.trim() || null,
    };
    fetchApi('/locations', { method: 'POST', body: JSON.stringify(body) })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessageError(json?.error ?? 'Erreur lors de la création.');
          return;
        }
        setMessageSuccess('Emplacement créé avec succès.');
        closeModal();
        load();
      })
      .catch(() => setMessageError('Erreur réseau.'))
      .finally(() => setSubmitLoading(false));
  };

  const handleSubmitEdit = async () => {
    if (!editingLocation) return;
    const err = validateForm();
    if (err) {
      setMessageError(err);
      return;
    }
    setSubmitLoading(true);
    setMessageError('');
    const body: LocationUpdateInput = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      location_type: form.location_type.trim() || null,
    };
    fetchApi(`/locations/${editingLocation.id}`, { method: 'PUT', body: JSON.stringify(body) })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessageError(json?.error ?? 'Erreur lors de la modification.');
          return;
        }
        setMessageSuccess('Emplacement modifié avec succès.');
        closeModal();
        load();
      })
      .catch(() => setMessageError('Erreur réseau.'))
      .finally(() => setSubmitLoading(false));
  };

  const openDeleteConfirm = (loc: Location) => setLocationToDelete(loc);

  const confirmDelete = () => {
    if (!locationToDelete) return;
    const id = locationToDelete.id;
    setDeleteConfirmId(id);
    fetchApi(`/locations/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (res.status === 204 || res.ok) {
          setMessageSuccess('Emplacement supprimé.');
          setLocationToDelete(null);
          load();
        } else {
          res
            .json()
            .then((j) => setMessageError(j?.error ?? 'Erreur lors de la suppression.'))
            .catch(() => setMessageError('Erreur lors de la suppression.'));
        }
      })
      .catch(() => setMessageError('Erreur réseau.'))
      .finally(() => setDeleteConfirmId(null));
  };

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return list;
    const q = debouncedSearch.trim().toLowerCase();
    return list.filter(
      (l) =>
        l.name?.toLowerCase().includes(q) ||
        (l.address?.toLowerCase().includes(q) ?? false) ||
        (l.location_type?.toLowerCase().includes(q) ?? false)
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
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:pb-6">
        {messageSuccess && (
          <div
            className="rounded-xl border border-green-600/40 bg-green-50 px-4 py-3 text-sm text-green-800"
            role="alert"
          >
            {messageSuccess}
            <button type="button" onClick={() => setMessageSuccess('')} className="ml-2 underline">
              Fermer
            </button>
          </div>
        )}
        {messageError && (
          <div
            className="rounded-xl border border-red-alert/30 bg-red-alert/10 px-4 py-3 text-sm text-red-alert"
            role="alert"
          >
            {messageError}
            <button type="button" onClick={() => setMessageError('')} className="ml-2 underline">
              Fermer
            </button>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-alert/30 bg-red-alert/10 px-4 py-3 text-sm text-red-alert">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-green-deep">Emplacements</h1>
            <p className="text-sm text-gray-warm">CRUD emplacements · Entrepôts, magasins</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-green-mid bg-transparent px-4 py-2.5 font-display text-sm font-bold text-green-deep"
          >
            <Plus className="h-4 w-4" />
            Nouvel emplacement
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-warm" />
            <input
              type="search"
              placeholder="Rechercher par nom ou adresse…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-green-deep/20 bg-white py-2.5 pl-10 pr-4 text-sm text-charcoal placeholder-gray-warm focus:border-green-mid focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-green-deep/10 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-mid" />
            </div>
          ) : (
            <DataTable<Location>
              columns={columns}
              data={sorted}
              getRowId={(l) => l.id}
              sortKey={sortKey}
              sortOrder={sortOrder}
              onSort={handleSort}
              emptyMessage="Aucun emplacement. Cliquez sur « Nouvel emplacement » pour en ajouter."
              renderActions={(l) => (
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(l)}
                    className="rounded p-1.5 text-charcoal hover:bg-cream-dark"
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteConfirm(l)}
                    disabled={deleteConfirmId === l.id}
                    className="rounded p-1.5 text-red-alert hover:bg-red-alert/10 disabled:opacity-50"
                    title="Supprimer"
                  >
                    {deleteConfirmId === l.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              )}
            />
          )}
        </div>

        {/* Modal Création / Édition */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-green-deep/20 bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="modal-title" className="font-display text-lg font-bold text-green-deep">
                {modalOpen === 'create' ? 'Nouvel emplacement' : 'Modifier l\'emplacement'}
              </h2>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-warm">Nom *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-green-deep/20 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-warm">Adresse</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-green-deep/20 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-warm">Type</label>
                  <input
                    type="text"
                    value={form.location_type}
                    onChange={(e) => setForm((f) => ({ ...f, location_type: e.target.value }))}
                    placeholder="ex. Entrepôt, Magasin"
                    className="mt-1 w-full rounded-lg border border-green-deep/20 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-green-deep/30 px-4 py-2 font-display text-sm font-bold text-green-deep"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={modalOpen === 'create' ? handleSubmitCreate : handleSubmitEdit}
                  disabled={submitLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-mid px-4 py-2 font-display text-sm font-bold text-white disabled:opacity-70"
                >
                  {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {modalOpen === 'create' ? 'Créer' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal confirmation suppression */}
        {locationToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4"
            onClick={(e) => e.target === e.currentTarget && setLocationToDelete(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-green-deep/20 bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="delete-modal-title" className="font-display text-lg font-bold text-green-deep">
                Supprimer cet emplacement ?
              </h2>
              <p className="mt-2 text-sm text-charcoal">
                Êtes-vous sûr de vouloir supprimer « {locationToDelete.name} » ?
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLocationToDelete(null)}
                  className="rounded-xl border border-green-deep/30 px-4 py-2 font-display text-sm font-bold text-green-deep"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteConfirmId === locationToDelete.id}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-alert px-4 py-2 font-display text-sm font-bold text-white disabled:opacity-70"
                >
                  {deleteConfirmId === locationToDelete.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
