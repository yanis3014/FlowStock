'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { Plus, Search, Package, Pencil, Trash2, Loader2, History } from 'lucide-react';
import type { Product, ProductUnit, StockStatus, LocationRef, SupplierRef } from '@bmad/shared';

/** Aligné avec l’API /products et @bmad/shared Product */

const UNITS: { value: ProductUnit; label: string }[] = [
  { value: 'piece', label: 'Pièce' },
  { value: 'kg', label: 'kg' },
  { value: 'liter', label: 'L' },
  { value: 'box', label: 'Caisse' },
  { value: 'pack', label: 'Pack' },
];

function badgeClass(status: StockStatus) {
  return status === 'critical'
    ? 'bg-red-alert/15 text-red-alert border-red-alert/30'
    : status === 'low'
      ? 'bg-orange-warn/15 text-orange-warn border-orange-warn/30'
      : 'bg-green-bright/15 text-green-bright border-green-bright/30';
}

const emptyForm = {
  sku: '',
  name: '',
  description: '',
  unit: 'piece' as ProductUnit,
  quantity: 0,
  min_quantity: null as number | null,
  location_id: '',
  supplier_id: '',
  purchase_price: null as number | null,
  selling_price: null as number | null,
  lead_time_days: 7,
};

export default function StocksPage() {
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<StockStatus | 'all'>('all');
  const [filterLocationId, setFilterLocationId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageSuccess, setMessageSuccess] = useState('');
  const [messageError, setMessageError] = useState('');
  const [modalOpen, setModalOpen] = useState<'create' | 'edit' | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [locations, setLocations] = useState<LocationRef[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRef[]>([]);
  const [refsLoadError, setRefsLoadError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const loadProducts = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.set('page', String(pagination.page));
    params.set('limit', String(pagination.limit));
    if (search.trim()) params.set('search', search.trim());
    // API supports low_stock=true for low/critical. Filter "ok" requires client-side filtering (no API param).
    if (filterStatus === 'low' || filterStatus === 'critical') params.set('low_stock', 'true');
    if (filterLocationId) params.set('location_id', filterLocationId);
    fetchApi(`/products?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Erreur chargement des stocks');
        return res.json();
      })
      .then((json) => {
        if (json?.success && json?.data) {
          setProducts(json.data);
          if (json.pagination) {
            setPagination((p) => ({
              ...p,
              total: json.pagination.total ?? 0,
              total_pages: json.pagination.total_pages ?? 0,
            }));
          }
        } else setProducts([]);
      })
      .catch(() => {
        setError('Impossible de charger les stocks.');
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [token, fetchApi, pagination.page, pagination.limit, search, filterStatus, filterLocationId]);

  useEffect(() => {
    if (!token && !isLoading) router.push('/login?returnUrl=/stocks');
  }, [token, isLoading, router]);

  useEffect(() => {
    if (token) loadProducts();
  }, [token, loadProducts]);

  useEffect(() => {
    if (!token) return;
    setRefsLoadError('');
    fetchApi('/locations')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.success && Array.isArray(j.data)) setLocations(j.data);
      })
      .catch(() => setRefsLoadError('Impossible de charger les emplacements ou fournisseurs.'));
    fetchApi('/suppliers')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.success && Array.isArray(j.data)) setSuppliers(j.data);
      })
      .catch(() => setRefsLoadError('Impossible de charger les emplacements ou fournisseurs.'));
  }, [token, fetchApi]);

  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setModalOpen('create');
    setMessageError('');
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description ?? '',
      unit: p.unit,
      quantity: p.quantity,
      min_quantity: p.min_quantity,
      location_id: p.location?.id ?? '',
      supplier_id: p.supplier?.id ?? '',
      purchase_price: p.purchase_price,
      selling_price: p.selling_price,
      lead_time_days: p.lead_time_days,
    });
    setModalOpen('edit');
    setMessageError('');
  };

  const closeModal = () => {
    setModalOpen(null);
    setEditingProduct(null);
    setForm(emptyForm);
    setMessageError('');
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return 'Le nom est obligatoire.';
    if (!form.sku.trim()) return 'Le SKU est obligatoire.';
    if (form.quantity < 0) return 'La quantité doit être >= 0.';
    if (form.min_quantity != null && form.min_quantity < 0) return 'La quantité minimum doit être >= 0.';
    if (!UNITS.some((u) => u.value === form.unit)) return 'Unité invalide.';
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
    const body = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      unit: form.unit,
      quantity: form.quantity,
      min_quantity: form.min_quantity,
      location_id: form.location_id || null,
      supplier_id: form.supplier_id || null,
      purchase_price: form.purchase_price,
      selling_price: form.selling_price,
      lead_time_days: form.lead_time_days,
    };
    fetchApi('/products', { method: 'POST', body: JSON.stringify(body) })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessageError(json?.error ?? 'Erreur lors de la création.');
          return;
        }
        setMessageSuccess('Stock créé avec succès.');
        closeModal();
        loadProducts();
      })
      .catch(() => setMessageError('Erreur réseau.'))
      .finally(() => setSubmitLoading(false));
  };

  const handleSubmitEdit = async () => {
    if (!editingProduct) return;
    const err = validateForm();
    if (err) {
      setMessageError(err);
      return;
    }
    setSubmitLoading(true);
    setMessageError('');
    const body = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      unit: form.unit,
      quantity: form.quantity,
      min_quantity: form.min_quantity,
      location_id: form.location_id || null,
      supplier_id: form.supplier_id || null,
      purchase_price: form.purchase_price,
      selling_price: form.selling_price,
      lead_time_days: form.lead_time_days,
    };
    fetchApi(`/products/${editingProduct.id}`, { method: 'PUT', body: JSON.stringify(body) })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessageError(json?.error ?? 'Erreur lors de la modification.');
          return;
        }
        setMessageSuccess('Stock modifié avec succès.');
        closeModal();
        loadProducts();
      })
      .catch(() => setMessageError('Erreur réseau.'))
      .finally(() => setSubmitLoading(false));
  };

  const openDeleteConfirm = (p: Product) => setProductToDelete(p);

  const confirmDelete = () => {
    if (!productToDelete) return;
    const id = productToDelete.id;
    setDeleteConfirmId(id);
    fetchApi(`/products/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (res.status === 204 || res.ok) {
          setMessageSuccess('Stock supprimé.');
          setProductToDelete(null);
          loadProducts();
        } else {
          return res.json().then((j) => {
            setMessageError(j?.error ?? 'Erreur lors de la suppression.');
          });
        }
      })
      .catch(() => setMessageError('Erreur réseau.'))
      .finally(() => setDeleteConfirmId(null));
  };

  const filteredList =
    filterStatus === 'all'
      ? products
      : products.filter((p) => p.stock_status === filterStatus);

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
            <button
              type="button"
              onClick={() => setMessageSuccess('')}
              className="ml-2 underline"
            >
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
            <button
              type="button"
              onClick={() => setMessageError('')}
              className="ml-2 underline"
            >
              Fermer
            </button>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-alert/30 bg-red-alert/10 px-4 py-3 text-sm text-red-alert">
            {error}
          </div>
        )}
        {refsLoadError && (
          <div className="rounded-xl border border-orange-warn/30 bg-orange-warn/10 px-4 py-3 text-sm text-orange-warn">
            {refsLoadError}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-green-deep">Stocks</h1>
            <p className="text-sm text-gray-warm">CRUD stocks · Pilotage hors service</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/rush"
              className="inline-flex items-center gap-2 rounded-xl bg-green-mid px-4 py-2.5 font-display text-sm font-bold text-white"
            >
              <Package className="h-4 w-4" />
              Mode Rush
            </Link>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-green-mid bg-transparent px-4 py-2.5 font-display text-sm font-bold text-green-deep"
            >
              <Plus className="h-4 w-4" />
              Nouveau produit
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-warm" />
            <input
              type="search"
              placeholder="Rechercher (nom, SKU)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadProducts()}
              className="w-full rounded-xl border border-green-deep/20 bg-white py-2.5 pl-10 pr-4 text-sm text-charcoal placeholder-gray-warm focus:border-green-mid focus:outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StockStatus | 'all')}
            className="rounded-xl border border-green-deep/20 bg-white px-4 py-2.5 text-sm text-charcoal"
          >
            <option value="all">Tous les statuts</option>
            <option value="critical">Critique</option>
            <option value="low">À surveiller</option>
            <option value="ok">OK</option>
          </select>
          <select
            value={filterLocationId}
            onChange={(e) => setFilterLocationId(e.target.value)}
            className="rounded-xl border border-green-deep/20 bg-white px-4 py-2.5 text-sm text-charcoal"
          >
            <option value="">Tous les emplacements</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadProducts}
            className="rounded-xl bg-green-deep/10 px-4 py-2.5 font-display text-sm font-bold text-green-deep"
          >
            Actualiser
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-green-deep/10 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-mid" />
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-cream-dark bg-green-deep/5">
                  <th className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    Nom
                  </th>
                  <th className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    Quantité
                  </th>
                  <th className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    Unité
                  </th>
                  <th className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    Emplacement
                  </th>
                  <th className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-right font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-warm">
                      Aucun stock. Cliquez sur « Nouveau produit » pour en ajouter.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-cream-dark last:border-0 hover:bg-cream/50"
                    >
                      <td className="px-4 py-3 font-display font-semibold text-green-deep">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-charcoal">{row.sku}</td>
                      <td className="px-4 py-3 font-medium text-charcoal">{row.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-warm">{row.unit}</td>
                      <td className="px-4 py-3 text-sm text-charcoal">
                        {row.location?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${badgeClass(row.stock_status)}`}
                        >
                          {row.stock_status === 'critical'
                            ? 'Critique'
                            : row.stock_status === 'low'
                              ? 'Attention'
                              : 'OK'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/movements?product_id=${row.id}`}
                          className="inline-flex rounded p-1.5 text-charcoal hover:bg-cream-dark"
                          title="Historique"
                        >
                          <History className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded p-1.5 text-charcoal hover:bg-cream-dark"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteConfirm(row)}
                          disabled={deleteConfirmId === row.id}
                          className="rounded p-1.5 text-red-alert hover:bg-red-alert/10 disabled:opacity-50"
                          title="Supprimer"
                        >
                          {deleteConfirmId === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
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
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-green-deep/20 bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="modal-title" className="font-display text-lg font-bold text-green-deep">
                {modalOpen === 'create' ? 'Nouveau produit' : 'Modifier le produit'}
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
                  <label className="block text-xs font-semibold text-gray-warm">SKU *</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-green-deep/20 px-3 py-2 text-sm"
                    disabled={modalOpen === 'edit'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-warm">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-green-deep/20 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-warm">Quantité</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.quantity}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))
                      }
                      className="mt-1 w-full rounded-lg border border-green-deep/20 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-warm">Unité</label>
                    <select
                      value={form.unit}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, unit: e.target.value as ProductUnit }))
                      }
                      className="mt-1 w-full rounded-lg border border-green-deep/20 px-3 py-2 text-sm"
                    >
                      {UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-warm">
                    Quantité min. (alerte)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.min_quantity ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => ({
                        ...f,
                        min_quantity: v === '' ? null : parseFloat(v) || 0,
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-green-deep/20 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-warm">Emplacement</label>
                  <select
                    value={form.location_id}
                    onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-green-deep/20 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-warm">Fournisseur</label>
                  <select
                    value={form.supplier_id}
                    onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-green-deep/20 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-warm">Prix d&apos;achat (€)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.purchase_price ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => ({
                          ...f,
                          purchase_price: v === '' ? null : parseFloat(v) || 0,
                        }));
                      }}
                      className="mt-1 w-full rounded-lg border border-green-deep/20 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-warm">Prix de vente (€)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.selling_price ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => ({
                          ...f,
                          selling_price: v === '' ? null : parseFloat(v) || 0,
                        }));
                      }}
                      className="mt-1 w-full rounded-lg border border-green-deep/20 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-warm">
                    Délai livraison (jours)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.lead_time_days}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lead_time_days: parseInt(e.target.value, 10) || 0 }))
                    }
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
        {productToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4"
            onClick={(e) => e.target === e.currentTarget && setProductToDelete(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-green-deep/20 bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="delete-modal-title" className="font-display text-lg font-bold text-green-deep">
                Supprimer ce stock ?
              </h2>
              <p className="mt-2 text-sm text-charcoal">
                Êtes-vous sûr de vouloir supprimer « {productToDelete.name} » (SKU: {productToDelete.sku}) ?
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="rounded-xl border border-green-deep/30 px-4 py-2 font-display text-sm font-bold text-green-deep"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteConfirmId === productToDelete.id}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-alert px-4 py-2 font-display text-sm font-bold text-white disabled:opacity-70"
                >
                  {deleteConfirmId === productToDelete.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
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
