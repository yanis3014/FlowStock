'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Loader2, Upload, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { DataTable, type DataTableColumn, type PaginationState } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import type { Sale, SaleCreateInput, SaleUpdateInput } from '@bmad/shared';

const PAGE_SIZE = 25;

const emptyForm = {
  sale_date: '',
  product_id: '',
  quantity_sold: '',
  unit_price: '',
  location_id: '',
};

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

interface ProductRef {
  id: string;
  name: string;
  sku?: string;
}

export default function SalesPage() {
  const { token } = useAuth();
  const { fetchApi } = useApi();
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
  const [modalOpen, setModalOpen] = useState<'create' | 'edit' | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    columns: string[];
    sampleRows: Record<string, string>[];
    suggestedMapping: Record<string, string>;
  } | null>(null);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: { row: number; value?: string; message: string }[];
    totalRows: number;
  } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreviewError, setImportPreviewError] = useState('');
  const modalFirstInputRef = useRef<HTMLInputElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const modalDeleteRef = useRef<HTMLDivElement>(null);
  const importModalContentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  const loadSales = useCallback(
    (pageOverride?: number) => {
      if (!token) return;
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      params.set('page', String(pageOverride ?? page));
      params.set('limit', String(PAGE_SIZE));
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
    },
    [token, fetchApi, page, dateFrom, dateTo, productId, locationId, sortKey, sortOrder]
  );

  useEffect(() => {
    if (token) loadSales();
  }, [token, loadSales]);

  useEffect(() => {
    if (!token) return;
    // Limite 500 produits / 100 emplacements pour les selects (au-delà, envisager recherche)
    fetchApi('/products?limit=500')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) =>
        j?.success && j?.data
          ? setProducts(j.data.map((p: { id: string; name: string; sku?: string }) => ({ id: p.id, name: p.name, sku: p.sku })))
          : undefined
      );
    fetchApi('/locations?limit=100')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) =>
        j?.success && j?.data ? setLocations(j.data.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name }))) : undefined
      );
  }, [token, fetchApi]);

  const openCreate = () => {
    setEditingSale(null);
    setForm({
      sale_date: todayDateStr(),
      product_id: '',
      quantity_sold: '',
      unit_price: '',
      location_id: '',
    });
    setModalOpen('create');
  };

  const openEdit = async (sale: Sale) => {
    setEditLoadingId(sale.id);
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    try {
      const res = await fetchApi(`/sales/${sale.id}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error ?? 'Impossible de charger la vente.');
        return;
      }
      const json = await res.json();
      const fresh = json?.success && json?.data ? json.data : sale;
      setEditingSale(fresh);
      const saleDate = fresh.sale_date ? fresh.sale_date.slice(0, 10) : todayDateStr();
      setForm({
        sale_date: saleDate,
        product_id: fresh.product_id ?? '',
        quantity_sold: String(fresh.quantity_sold ?? ''),
        unit_price: fresh.unit_price != null ? String(fresh.unit_price) : '',
        location_id: fresh.location_id ?? '',
      });
      setModalOpen('edit');
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setEditLoadingId(null);
    }
  };

  const closeModal = () => {
    setModalOpen(null);
    setEditingSale(null);
    setForm(emptyForm);
    if (previousFocusRef.current?.focus) previousFocusRef.current.focus();
  };

  const validateForm = (): string | null => {
    if (!form.product_id.trim()) return 'Le produit est obligatoire.';
    const qty = parseFloat(form.quantity_sold);
    if (isNaN(qty) || qty <= 0) return 'La quantité doit être supérieure à 0.';
    if (form.unit_price.trim()) {
      const price = parseFloat(form.unit_price);
      if (isNaN(price) || price < 0) return 'Le prix unitaire doit être >= 0.';
    }
    if (form.sale_date.trim()) {
      const d = new Date(form.sale_date);
      if (isNaN(d.getTime())) return 'Date invalide.';
    }
    return null;
  };

  const handleSubmitCreate = async () => {
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitLoading(true);
    const body: SaleCreateInput = {
      product_id: form.product_id.trim(),
      sale_date: form.sale_date.trim() ? `${form.sale_date}T12:00:00.000Z` : undefined,
      quantity_sold: parseFloat(form.quantity_sold),
      unit_price: form.unit_price.trim() ? parseFloat(form.unit_price) : null,
      location_id: form.location_id.trim() || null,
    };
    fetchApi('/sales', { method: 'POST', body: JSON.stringify(body) })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(json?.error ?? 'Erreur lors de la création.');
          return;
        }
        toast.success('Vente enregistrée avec succès.');
        closeModal();
        setPage(1);
        loadSales(1);
      })
      .catch(() => toast.error('Erreur réseau.'))
      .finally(() => setSubmitLoading(false));
  };

  const handleSubmitEdit = async () => {
    if (!editingSale) return;
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitLoading(true);
    const body: SaleUpdateInput = {
      product_id: form.product_id.trim(),
      sale_date: form.sale_date.trim() ? `${form.sale_date}T12:00:00.000Z` : undefined,
      quantity_sold: parseFloat(form.quantity_sold),
      unit_price: form.unit_price.trim() ? parseFloat(form.unit_price) : null,
      location_id: form.location_id.trim() || null,
    };
    fetchApi(`/sales/${editingSale.id}`, { method: 'PUT', body: JSON.stringify(body) })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(json?.error ?? 'Erreur lors de la modification.');
          return;
        }
        toast.success('Vente modifiée avec succès.');
        closeModal();
        loadSales();
      })
      .catch(() => toast.error('Erreur réseau.'))
      .finally(() => setSubmitLoading(false));
  };

  useEffect(() => {
    if (modalOpen && modalFirstInputRef.current) {
      modalFirstInputRef.current.focus();
    }
  }, [modalOpen]);

  const setupFocusTrap = (container: HTMLElement | null) => {
    if (!container) return () => {};
    const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (focusable.length <= 1) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  };

  useEffect(() => {
    if (modalOpen && modalContentRef.current) {
      return setupFocusTrap(modalContentRef.current);
    }
  }, [modalOpen]);

  useEffect(() => {
    if (saleToDelete && modalDeleteRef.current) {
      return setupFocusTrap(modalDeleteRef.current);
    }
  }, [saleToDelete]);

  useEffect(() => {
    if (importModalOpen && importModalContentRef.current) {
      return setupFocusTrap(importModalContentRef.current);
    }
  }, [importModalOpen]);

  const openDeleteConfirm = (sale: Sale) => setSaleToDelete(sale);

  const confirmDelete = () => {
    if (!saleToDelete) return;
    const id = saleToDelete.id;
    setDeleteConfirmId(id);
    const wasLastOnPage = list.length === 1 && (pagination?.total ?? 0) > 1;
    fetchApi(`/sales/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (res.status === 204 || res.ok) {
          toast.success('Vente supprimée.');
          setSaleToDelete(null);
          if (wasLastOnPage) setPage(1);
          loadSales(wasLastOnPage ? 1 : undefined);
        } else {
          res
            .json()
            .then((j) => toast.error(j?.error ?? 'Erreur lors de la suppression.'))
            .catch(() => toast.error('Erreur lors de la suppression.'));
        }
      })
      .catch(() => toast.error('Erreur réseau.'))
      .finally(() => setDeleteConfirmId(null));
  };

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

  const formatSource = (s: string) => {
    const map: Record<string, string> = { manual: 'Manuelle', csv: 'Import CSV', csv_import: 'Import CSV', pos_terminal: 'POS', api: 'API' };
    return map[s] ?? s;
  };

  const SALE_MAPPING_FIELDS = [
    { value: '', label: '—' },
    { value: 'sale_date', label: 'Date vente' },
    { value: 'product_sku', label: 'Produit (SKU)' },
    { value: 'quantity_sold', label: 'Quantité' },
    { value: 'unit_price', label: 'Prix unitaire' },
    { value: 'location_name', label: 'Emplacement' },
  ] as const;

  const downloadTemplate = useCallback(() => {
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(`${apiUrl}/sales/import/template`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('Téléchargement impossible');
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sales-import-template.csv';
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Erreur lors du téléchargement du template'));
  }, [token]);

  const openImportModal = () => {
    setImportModalOpen(true);
    setImportStep(1);
    setImportFile(null);
    setImportPreview(null);
    setImportMapping({});
    setImportResult(null);
    setImportPreviewError('');
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportStep(1);
    setImportFile(null);
    setImportPreview(null);
    setImportMapping({});
    setImportResult(null);
    setImportPreviewError('');
  };

  const handleImportFileSelect = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setImportPreviewError('Seuls les fichiers CSV sont acceptés.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setImportPreviewError('Fichier trop volumineux (max 5 Mo).');
        return;
      }
      setImportPreviewError('');
      setImportFile(file);
      setImportLoading(true);
      const form = new FormData();
      form.append('file', file);
      try {
        const res = await fetchApi('/sales/import/preview', { method: 'POST', body: form });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setImportPreviewError(json?.error ?? 'Impossible de lire le fichier.');
          return;
        }
        if (json?.success && json?.data) {
          const { columns, sampleRows, suggestedMapping } = json.data;
          setImportPreview({ columns, sampleRows: sampleRows || [], suggestedMapping: suggestedMapping || {} });
          setImportMapping(suggestedMapping || {});
          setImportStep(2);
        } else {
          setImportPreviewError('Réponse invalide.');
        }
      } catch {
        setImportPreviewError('Erreur réseau.');
      } finally {
        setImportLoading(false);
      }
    },
    [fetchApi]
  );

  const handleLaunchImport = useCallback(async () => {
    if (!importFile) return;
    setImportLoading(true);
    const form = new FormData();
    form.append('file', importFile);
    form.append('mapping', JSON.stringify(importMapping));
    try {
      const res = await fetchApi('/sales/import', { method: 'POST', body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error ?? 'Import échoué.');
        return;
      }
      if (json?.success && json?.data) {
        setImportResult({
          imported: json.data.imported ?? 0,
          errors: json.data.errors ?? [],
          totalRows: json.data.totalRows ?? 0,
        });
        setImportStep(3);
      } else {
        toast.error('Réponse invalide.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setImportLoading(false);
    }
  }, [importFile, importMapping, fetchApi]);

  const hasProductSkuMapping = Object.values(importMapping).includes('product_sku');

  const handleImportCloseAndRefresh = () => {
    const imported = importResult?.imported ?? 0;
    const errorsCount = importResult?.errors?.length ?? 0;
    closeImportModal();
    setPage(1);
    loadSales(1);
    if (imported > 0) {
      toast.success(errorsCount > 0 ? `${imported} ventes importées. ${errorsCount} erreur(s) signalées.` : `${imported} ventes importées avec succès.`);
    } else if (errorsCount > 0) {
      toast.error(`Aucune vente importée. ${errorsCount} erreur(s) rencontrées.`);
    }
  };

  const columns: DataTableColumn<Sale>[] = [
    { key: 'product_name', label: 'Produit', render: (s) => s.product_name ?? '—' },
    { key: 'quantity_sold', label: 'Quantité', sortKey: 'quantity_sold', render: (s) => String(s.quantity_sold) },
    { key: 'unit_price', label: 'Prix unitaire', sortKey: 'total_amount', render: (s) => formatCurrency(s.unit_price) },
    { key: 'total_amount', label: 'Montant', sortKey: 'total_amount', render: (s) => formatCurrency(s.total_amount) },
    { key: 'sale_date', label: 'Date', sortKey: 'sale_date', render: (s) => formatDate(s.sale_date) },
    { key: 'source', label: 'Source', render: (s) => formatSource(s.source ?? '') },
    { key: 'location_name', label: 'Emplacement', render: (s) => s.location_name ?? '—' },
  ];

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-6xl space-y-6 p-6 pb-24 md:pb-6">
        {error && (
          <div className="rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">{error}</div>
        )}

        <PageHeader
          title="Ventes"
          subtitle="Saisie manuelle · Import CSV · Liste et historique des ventes"
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openImportModal}
                className="inline-flex items-center gap-2 border border-green-deep text-green-deep bg-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-deep/5 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Importer CSV
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 bg-green-deep text-cream px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-green transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nouvelle vente
              </button>
            </div>
          }
        />

        <div className="flex flex-wrap items-end gap-3 bg-white border border-charcoal/8 rounded-xl p-4 shadow-sm">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-charcoal/60">Du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-charcoal/60">Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-charcoal/60">Produit</label>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setPage(1);
              }}
              className="min-w-[180px] rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
            >
              <option value="">Tous</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-charcoal/60">Emplacement</label>
            <select
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                setPage(1);
              }}
              className="min-w-[160px] rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
            >
              <option value="">Tous</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-charcoal/8 bg-white shadow-sm">
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
              emptyMessage="Aucune vente. Cliquez sur « Nouvelle vente » pour en ajouter."
              renderActions={(s) => (
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    disabled={editLoadingId === s.id}
                    className="p-2 rounded-lg text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 disabled:opacity-50 transition-colors"
                    title="Modifier"
                  >
                    {editLoadingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
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

        {/* Modal Création / Édition */}
        {modalOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
            onKeyDown={(e) => e.key === 'Escape' && closeModal()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div
              ref={modalContentRef}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="modal-title" className="text-lg font-display font-bold text-charcoal">
                {modalOpen === 'create' ? 'Nouvelle vente' : 'Modifier la vente'}
              </h2>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-charcoal/60 mb-1.5" htmlFor="sale-date">
                    Date *
                  </label>
                  <input
                    id="sale-date"
                    ref={modalFirstInputRef}
                    type="date"
                    value={form.sale_date}
                    onChange={(e) => setForm((f) => ({ ...f, sale_date: e.target.value }))}
                    className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal/60 mb-1.5" htmlFor="sale-product">
                    Produit *
                  </label>
                  <select
                    id="sale-product"
                    value={form.product_id}
                    onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
                    className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                  >
                    <option value="">Sélectionner un produit</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal/60 mb-1.5" htmlFor="sale-quantity">
                    Quantité *
                  </label>
                  <input
                    id="sale-quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.quantity_sold}
                    onChange={(e) => setForm((f) => ({ ...f, quantity_sold: e.target.value }))}
                    className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal/60 mb-1.5" htmlFor="sale-unit-price">
                    Prix unitaire (optionnel)
                  </label>
                  <input
                    id="sale-unit-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unit_price}
                    onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                    className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal/60 mb-1.5" htmlFor="sale-location">
                    Emplacement (optionnel)
                  </label>
                  <select
                    id="sale-location"
                    value={form.location_id}
                    onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}
                    className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
                  >
                    <option value="">Aucun</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="border border-charcoal/20 text-charcoal px-4 py-2 rounded-lg text-sm font-medium hover:bg-charcoal/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={modalOpen === 'create' ? handleSubmitCreate : handleSubmitEdit}
                  disabled={submitLoading}
                  className="inline-flex items-center gap-2 bg-green-deep text-cream px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-green disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {modalOpen === 'create' ? 'Enregistrer' : 'Modifier'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal confirmation suppression */}
        {saleToDelete && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setSaleToDelete(null)}
            onKeyDown={(e) => e.key === 'Escape' && setSaleToDelete(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div
              ref={modalDeleteRef}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="delete-modal-title" className="text-lg font-display font-bold text-charcoal">
                Supprimer cette vente ?
              </h2>
              <p className="mt-2 text-sm text-charcoal">
                Êtes-vous sûr de vouloir supprimer la vente « {saleToDelete.product_name ?? '—'} » du{' '}
                {formatDate(saleToDelete.sale_date)} ?
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSaleToDelete(null)}
                  className="border border-charcoal/20 text-charcoal px-4 py-2 rounded-lg text-sm font-medium hover:bg-charcoal/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteConfirmId === saleToDelete.id}
                  className="inline-flex items-center gap-2 border border-terracotta text-terracotta px-4 py-2 rounded-lg text-sm font-medium hover:bg-terracotta/5 disabled:opacity-50 transition-colors"
                >
                  {deleteConfirmId === saleToDelete.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Import CSV */}
        {importModalOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && closeImportModal()}
            onKeyDown={(e) => e.key === 'Escape' && closeImportModal()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-modal-title"
          >
            <div ref={importModalContentRef} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-charcoal/8">
              <h2 id="import-modal-title" className="text-lg font-display font-bold text-charcoal">
                Import CSV ventes
              </h2>

              {importStep === 1 && (
                <>
                  <p className="mt-2 text-sm text-charcoal/80">
                    Étape 1 : Choisissez un fichier CSV (max 5 Mo). Les colonnes seront détectées automatiquement.
                  </p>
                  <div className="mt-4">
                    <label className="block border-2 border-dashed border-charcoal/20 rounded-xl p-6 text-center cursor-pointer hover:border-green-deep/40 hover:bg-green-deep/5 transition-colors">
                      <input
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImportFileSelect(f);
                        }}
                        disabled={importLoading}
                      />
                      {importLoading ? (
                        <span className="inline-flex items-center gap-2 text-charcoal/70">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Analyse du fichier…
                        </span>
                      ) : (
                        <span className="text-charcoal/80">
                          Glissez-déposez un fichier ici ou <span className="text-green-deep font-medium">cliquez pour parcourir</span>
                        </span>
                      )}
                    </label>
                  </div>
                  {importPreviewError && (
                    <div className="mt-3 rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta" role="alert">
                      {importPreviewError}
                    </div>
                  )}
                </>
              )}

              {importStep === 2 && importPreview && (
                <>
                  <p className="mt-2 text-sm text-charcoal/80">
                    Étape 2 : Vérifiez le mapping des colonnes puis lancez l&apos;import.
                  </p>
                  <div className="mt-4 space-y-3">
                    {importPreview.columns.map((col) => (
                      <div key={col} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-charcoal min-w-[140px] truncate" title={col}>
                          {col}
                        </span>
                        <span className="text-charcoal/50">→</span>
                        <select
                          value={importMapping[col] ?? ''}
                          onChange={(e) => setImportMapping((m) => ({ ...m, [col]: e.target.value }))}
                          className="flex-1 rounded-lg border border-charcoal/15 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20"
                        >
                          {SALE_MAPPING_FIELDS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  {importPreview.sampleRows.length > 0 && (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-charcoal/10">
                      <p className="text-xs font-medium text-charcoal/60 px-3 py-2 border-b border-charcoal/10">Aperçu (5 premières lignes)</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-charcoal/5">
                            {importPreview.columns.map((c) => (
                              <th key={c} className="text-left px-3 py-2 font-medium text-charcoal/80 truncate max-w-[120px]">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.sampleRows.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-t border-charcoal/8">
                              {importPreview!.columns.map((c) => (
                                <td key={c} className="px-3 py-1.5 text-charcoal/90 truncate max-w-[120px]">
                                  {row[c] ?? '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {!hasProductSkuMapping && (
                    <p className="mt-2 text-sm text-terracotta" role="alert">
                      Mappez au moins une colonne au champ « Produit (SKU) » pour lancer l&apos;import.
                    </p>
                  )}
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setImportStep(1); setImportPreviewError(''); }}
                      className="border border-charcoal/20 text-charcoal px-4 py-2 rounded-lg text-sm font-medium hover:bg-charcoal/5 transition-colors"
                    >
                      Retour
                    </button>
                    <button
                      type="button"
                      onClick={handleLaunchImport}
                      disabled={importLoading || !hasProductSkuMapping}
                      title={!hasProductSkuMapping ? 'Veuillez mapper au moins une colonne au champ Produit (SKU)' : undefined}
                      className="inline-flex items-center gap-2 bg-green-deep text-cream px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-green disabled:opacity-50 transition-colors"
                    >
                      {importLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Lancer l&apos;import
                    </button>
                  </div>
                </>
              )}

              {importStep === 3 && importResult && (
                <>
                  <p className="mt-2 text-sm text-charcoal/80">Résultat de l&apos;import</p>
                  <div className="mt-4 rounded-xl border border-charcoal/10 bg-charcoal/[0.02] p-4 space-y-2" role="status" aria-live="polite">
                    <p className="text-sm text-charcoal">
                      <strong>{importResult.imported}</strong> vente(s) importée(s) sur <strong>{importResult.totalRows}</strong> ligne(s).
                    </p>
                    {importResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-terracotta mb-1">{importResult.errors.length} erreur(s) :</p>
                        <ul className="text-xs text-charcoal/90 list-disc list-inside max-h-32 overflow-y-auto">
                          {importResult.errors.slice(0, 20).map((err, i) => (
                            <li key={i}>
                              Ligne {err.row} : {err.message}
                              {err.value != null ? ` (${String(err.value).slice(0, 30)}…)` : ''}
                            </li>
                          ))}
                          {importResult.errors.length > 20 && (
                            <li>… et {importResult.errors.length - 20} autre(s) erreur(s)</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleImportCloseAndRefresh}
                      className="inline-flex items-center gap-2 bg-green-deep text-cream px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-green transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                </>
              )}

              <div className="mt-6 pt-4 border-t border-charcoal/10">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 text-sm text-green-deep hover:underline focus:outline-none focus:ring-2 focus:ring-green-deep/30 rounded"
                >
                  <Download className="h-4 w-4" />
                  Télécharger le template CSV
                </button>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={closeImportModal}
                  className="text-sm text-charcoal/60 hover:text-charcoal transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
