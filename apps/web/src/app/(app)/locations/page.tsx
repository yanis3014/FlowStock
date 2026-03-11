'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Search, Trash2, Plus, Pencil, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useCrudModal } from '@/hooks/useCrudModal';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import type { Location, LocationCreateInput, LocationUpdateInput } from '@bmad/shared';

const emptyForm = {
  name: '',
  address: '',
  location_type: '',
};

type LocationForm = typeof emptyForm;

export default function LocationsPage() {
  const { token } = useAuth();
  const { fetchApi } = useApi();
  const [list, setList] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const modalFirstInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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

  const handleCreate = useCallback(
    async (formData: LocationForm) => {
      const body: LocationCreateInput = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        location_type: formData.location_type.trim() || null,
      };
      const res = await fetchApi('/locations', { method: 'POST', body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? 'Erreur lors de la création.');
      load();
    },
    [fetchApi, load]
  );

  const handleUpdate = useCallback(
    async (id: string, formData: LocationForm) => {
      const body: LocationUpdateInput = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        location_type: formData.location_type.trim() || null,
      };
      const res = await fetchApi(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? 'Erreur lors de la modification.');
      load();
    },
    [fetchApi, load]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetchApi(`/locations/${id}`, { method: 'DELETE' });
      if (res.status !== 204 && !res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? 'Erreur lors de la suppression.');
      }
      setLocationToDelete(null);
      load();
    },
    [fetchApi, load]
  );

  const validateForm = useCallback((formData: LocationForm): string | null => {
    if (!formData.name.trim()) return 'Le nom est obligatoire.';
    return null;
  }, []);

  const {
    modalOpen,
    form,
    setForm,
    submitLoading,
    deleteConfirmId,
    setDeleteConfirmId,
    deleteLoading,
    openCreate,
    openEdit: openEditBase,
    closeModal,
    handleSubmit,
    handleDeleteConfirm,
    isEditing,
  } = useCrudModal<Location, LocationForm>({
    itemToForm: (l) => ({
      name: l.name ?? '',
      address: l.address ?? '',
      location_type: l.location_type ?? '',
    }),
    defaultForm: emptyForm,
    validateForm,
    onCreate: handleCreate,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
    messages: {
      created: 'Emplacement créé avec succès.',
      updated: 'Emplacement modifié avec succès.',
      deleted: 'Emplacement supprimé.',
    },
  });

  const openEdit = useCallback(
    async (loc: Location) => {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      try {
        const res = await fetchApi(`/locations/${loc.id}`);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          toast.error(j?.error ?? "Impossible de charger l'emplacement.");
          return;
        }
        const json = await res.json();
        const fresh = json?.success && json?.data ? json.data : loc;
        openEditBase(fresh);
      } catch {
        toast.error('Erreur réseau.');
      }
    },
    [fetchApi, openEditBase]
  );

  const closeModalWithFocus = useCallback(() => {
    closeModal();
    if (previousFocusRef.current?.focus) previousFocusRef.current.focus();
  }, [closeModal]);

  const openDeleteConfirm = useCallback(
    (loc: Location) => {
      setLocationToDelete(loc);
      setDeleteConfirmId(loc.id);
    },
    [setDeleteConfirmId]
  );

  const confirmDelete = useCallback(() => {
    handleDeleteConfirm();
  }, [handleDeleteConfirm]);

  useEffect(() => {
    if (modalOpen && modalFirstInputRef.current) {
      modalFirstInputRef.current.focus();
    }
  }, [modalOpen]);

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

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-6xl space-y-6 p-6 pb-24 md:pb-6">
        {error && (
          <div className="rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
            {error}
          </div>
        )}

        <PageHeader
          title="Emplacements"
          subtitle="Gérez vos entrepôts et points de vente"
          actions={
            <button
              type="button"
              onClick={() => {
                previousFocusRef.current = document.activeElement as HTMLElement | null;
                openCreate();
              }}
              className="inline-flex items-center gap-2 bg-green-deep text-cream px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-green transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nouvel emplacement
            </button>
          }
        />

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/35" />
            <input
              type="search"
              placeholder="Rechercher par nom ou adresse…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-charcoal/15 bg-white py-2.5 pl-10 pr-4 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-charcoal/8 bg-white shadow-sm">
          {loading ? (
            <TableSkeleton rows={8} cols={4} />
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
                    className="p-2 rounded-lg text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteConfirm(l)}
                    disabled={deleteConfirmId === l.id}
                    className="p-2 rounded-lg text-terracotta hover:bg-terracotta/5 disabled:opacity-50 transition-colors"
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && closeModalWithFocus()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="modal-title" className="text-lg font-display font-bold text-charcoal">
                {isEditing ? "Modifier l'emplacement" : 'Nouvel emplacement'}
              </h2>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-charcoal/60 mb-1.5" htmlFor="location-name">
                    Nom *
                  </label>
                  <input
                    id="location-name"
                    ref={modalFirstInputRef}
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal/60 mb-1.5">Adresse</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal/60 mb-1.5">Type</label>
                  <input
                    type="text"
                    value={form.location_type}
                    onChange={(e) => setForm((f) => ({ ...f, location_type: e.target.value }))}
                    placeholder="ex. Entrepôt, Magasin"
                    className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModalWithFocus}
                  className="border border-charcoal/20 text-charcoal px-4 py-2 rounded-lg text-sm font-medium hover:bg-charcoal/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitLoading}
                  className="inline-flex items-center gap-2 bg-green-deep text-cream px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-green disabled:opacity-50 transition-colors"
                >
                  {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEditing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal confirmation suppression */}
        {locationToDelete && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && (setLocationToDelete(null), setDeleteConfirmId(null))}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="delete-modal-title" className="text-lg font-display font-bold text-charcoal">
                Supprimer cet emplacement ?
              </h2>
              <p className="mt-2 text-sm text-charcoal">
                Êtes-vous sûr de vouloir supprimer « {locationToDelete.name} » ?
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLocationToDelete(null);
                    setDeleteConfirmId(null);
                  }}
                  className="border border-charcoal/20 text-charcoal px-4 py-2 rounded-lg text-sm font-medium hover:bg-charcoal/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                  className="inline-flex items-center gap-2 border border-terracotta text-terracotta px-4 py-2 rounded-lg text-sm font-medium hover:bg-terracotta/5 disabled:opacity-50 transition-colors"
                >
                  {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
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
