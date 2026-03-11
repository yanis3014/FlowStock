'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Search, Trash2, Plus, Pencil, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useCrudModal } from '@/hooks/useCrudModal';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import type { Supplier, SupplierCreateInput, SupplierUpdateInput } from '@bmad/shared';

const PAGE_SIZE = 25;

const emptyForm = {
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
};

type SupplierForm = typeof emptyForm;

export default function SuppliersPage() {
  const { token } = useAuth();
  const { fetchApi } = useApi();
  const [list, setList] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const modalFirstInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const load = useCallback(
    (pageNum: number = 1) => {
      if (!token) return;
      setLoading(true);
      setError('');
      fetchApi(`/suppliers?limit=${PAGE_SIZE}&page=${pageNum}`)
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error || `Erreur ${res.status}`);
          }
          return res.json();
        })
        .then((json) => {
          if (json?.success && json?.data) {
            setList(json.data);
            if (json.pagination)
              setPagination({
                page: json.pagination.page ?? pageNum,
                limit: json.pagination.limit ?? PAGE_SIZE,
                total: json.pagination.total ?? json.data.length,
              });
            else setPagination({ page: pageNum, limit: PAGE_SIZE, total: json.data.length });
          } else setError('Données invalides.');
        })
        .catch((err: Error) => setError(err.message || 'Erreur réseau.'))
        .finally(() => setLoading(false));
    },
    [token, fetchApi]
  );

  useEffect(() => {
    if (token) load(page);
  }, [token, page, load]);

  const handleCreate = useCallback(
    async (formData: SupplierForm) => {
      const body: SupplierCreateInput = {
        name: formData.name.trim(),
        contact_name: formData.contact_name.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
      };
      const res = await fetchApi('/suppliers', { method: 'POST', body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? 'Erreur lors de la création.');
      setPage(1);
      load(1);
    },
    [fetchApi, load]
  );

  const handleUpdate = useCallback(
    async (id: string, formData: SupplierForm) => {
      const body: SupplierUpdateInput = {
        name: formData.name.trim(),
        contact_name: formData.contact_name.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
      };
      const res = await fetchApi(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? 'Erreur lors de la modification.');
      load(page);
    },
    [fetchApi, load, page]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetchApi(`/suppliers/${id}`, { method: 'DELETE' });
      if (res.status !== 204 && !res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? 'Erreur lors de la suppression.');
      }
      setSupplierToDelete(null);
      load(page);
    },
    [fetchApi, load, page]
  );

  const validateForm = useCallback((formData: SupplierForm): string | null => {
    if (!formData.name.trim()) return 'Le nom est obligatoire.';
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      return "Format d'email invalide.";
    }
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
  } = useCrudModal<Supplier, SupplierForm>({
    itemToForm: (s) => ({
      name: s.name ?? '',
      contact_name: s.contact_name ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      address: s.address ?? '',
      notes: s.notes ?? '',
    }),
    defaultForm: emptyForm,
    validateForm,
    onCreate: handleCreate,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
    messages: {
      created: 'Fournisseur créé avec succès.',
      updated: 'Fournisseur modifié avec succès.',
      deleted: 'Fournisseur supprimé.',
    },
  });

  const openEdit = useCallback(
    async (sup: Supplier) => {
      setEditLoadingId(sup.id);
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      try {
        const res = await fetchApi(`/suppliers/${sup.id}`);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          toast.error(j?.error ?? 'Impossible de charger le fournisseur.');
          return;
        }
        const json = await res.json();
        const fresh = json?.success && json?.data ? json.data : sup;
        openEditBase(fresh);
      } catch {
        toast.error('Erreur réseau.');
      } finally {
        setEditLoadingId(null);
      }
    },
    [fetchApi, openEditBase]
  );

  const closeModalWithFocus = useCallback(() => {
    closeModal();
    if (previousFocusRef.current?.focus) previousFocusRef.current.focus();
  }, [closeModal]);

  const openDeleteConfirm = useCallback(
    (sup: Supplier) => {
      setSupplierToDelete(sup);
      setDeleteConfirmId(sup.id);
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

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-6xl space-y-6 p-6 pb-24 md:pb-6">
        {error && (
          <div className="rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
            {error}
          </div>
        )}

        <PageHeader
          title="Fournisseurs"
          subtitle="Gérez vos fournisseurs et associez-les à vos produits"
          actions={
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-green-deep text-cream px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-green transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nouveau fournisseur
            </button>
          }
        />

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/35" />
            <input
              type="search"
              placeholder="Rechercher par nom, contact, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-charcoal/15 bg-white py-2.5 pl-10 pr-4 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-charcoal/8 bg-white shadow-sm">
          {loading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : (
            <DataTable<Supplier>
              columns={columns}
              data={sorted}
              getRowId={(s) => s.id}
              sortKey={sortKey}
              sortOrder={sortOrder}
              onSort={handleSort}
              emptyMessage="Aucun fournisseur. Cliquez sur « Nouveau fournisseur » pour en ajouter."
              renderActions={(s) => (
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    disabled={editLoadingId === s.id}
                    className="p-2 rounded-lg text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 disabled:opacity-50 transition-colors"
                    title="Modifier"
                  >
                    {editLoadingId === s.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteConfirm(s)}
                    disabled={deleteConfirmId === s.id}
                    className="p-2 rounded-lg text-terracotta hover:bg-terracotta/5 disabled:opacity-50 transition-colors"
                    title="Supprimer"
                  >
                    {deleteConfirmId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              )}
            />
          )}
        </div>

        {pagination && pagination.total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-charcoal/50">
              Page {pagination.page} sur {Math.max(1, Math.ceil(pagination.total / pagination.limit))} ({pagination.total}{' '}
              fournisseur{pagination.total > 1 ? 's' : ''})
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 px-3 py-1.5 text-sm text-charcoal disabled:opacity-50 hover:bg-cream/50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={
                  pagination.page >= Math.ceil(pagination.total / pagination.limit) || loading
                }
                className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 px-3 py-1.5 text-sm text-charcoal disabled:opacity-50 hover:bg-cream/50 transition-colors"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

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
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="modal-title" className="text-lg font-display font-bold text-charcoal">
                {isEditing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </h2>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-charcoal/60 mb-1.5" htmlFor="supplier-name">
                    Nom *
                  </label>
                  <input
                    id="supplier-name"
                    ref={modalFirstInputRef}
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal/60 mb-1.5">Contact</label>
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                    className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal/60 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal/60 mb-1.5">Téléphone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
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
                  <label className="block text-xs font-medium text-charcoal/60 mb-1.5">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
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
        {supplierToDelete && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && (setSupplierToDelete(null), setDeleteConfirmId(null))}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="delete-modal-title" className="text-lg font-display font-bold text-charcoal">
                Supprimer ce fournisseur ?
              </h2>
              <p className="mt-2 text-sm text-charcoal">
                Êtes-vous sûr de vouloir supprimer « {supplierToDelete.name} » ?
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setSupplierToDelete(null); setDeleteConfirmId(null); }}
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
