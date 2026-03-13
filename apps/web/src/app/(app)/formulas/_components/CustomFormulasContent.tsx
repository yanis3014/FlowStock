'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, RotateCcw, Eye, Pencil, Trash2, Loader2, Copy, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { Skeleton } from '@/components/ui/Skeleton';

type TabId = 'editor' | 'library' | 'docs';

interface CustomFormula {
  id: string;
  name: string;
  description: string | null;
  formula_expression: string;
  variables_used: string[];
  created_at?: string | null;
}

interface VariableDef {
  name: string;
  description: string;
  requiresProduct: boolean;
}

interface Product {
  id: string;
  name?: string;
  sku?: string;
}

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'error';

const DOC_FUNCTIONS = ['SUM', 'AVG', 'MAX', 'MIN', 'COUNT', 'ABS', 'ROUND', 'CEIL', 'FLOOR', 'SQRT', 'POW', 'IF'];
const DOC_EXAMPLES = [
  { expr: '(PRIX_VENTE - PRIX_ACHAT) * QUANTITE', desc: 'Bénéfice total en stock' },
  { expr: '(PRIX_VENTE - PRIX_ACHAT) / PRIX_VENTE * 100', desc: 'Marge en %' },
  { expr: 'IF(STOCK_ACTUEL < VENTES_7J, 1, 0)', desc: 'Alerte stock faible (1=oui)' },
];

function formatPreviewResult(result: unknown): string {
  if (result == null) return '—';
  if (typeof result === 'object') {
    const obj = result as Record<string, number | null>;
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${v ?? '—'}`)
      .join('\n');
  }
  return String(result);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function CustomFormulasContent() {
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('editor');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expression, setExpression] = useState('');
  const [previewProductId, setPreviewProductId] = useState('');
  const [previewScope, setPreviewScope] = useState<'all' | 'product'>('product');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [formulas, setFormulas] = useState<CustomFormula[]>([]);
  const [variables, setVariables] = useState<VariableDef[]>([]);

  const [loadingFormulas, setLoadingFormulas] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingVars, setLoadingVars] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [editorSuccess, setEditorSuccess] = useState('');
  const [previewResult, setPreviewResult] = useState<unknown>(null);
  const [previewErrors, setPreviewErrors] = useState<Record<string, string> | null>(null);
  const [libraryError, setLibraryError] = useState('');

  // Real-time validation state (H-1)
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationError, setValidationError] = useState('');
  const [validationErrorPosition, setValidationErrorPosition] = useState<number | undefined>(undefined);

  // Inline delete confirmation state (M-2)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!token && !isLoading) {
      router.push('/login?returnUrl=/formulas');
    }
  }, [token, isLoading, router]);

  // Debounced real-time validation (H-1)
  useEffect(() => {
    const expr = expression.trim();
    if (!expr || !token) {
      setValidationStatus('idle');
      setValidationError('');
      setValidationErrorPosition(undefined);
      return;
    }
    setValidationStatus('validating');
    const timer = setTimeout(async () => {
      try {
        const res = await fetchApi('/formulas/custom/validate', {
          method: 'POST',
          body: JSON.stringify({ expression: expr }),
        });
        const json = await res.json();
        const data = json?.data;
        if (data?.valid) {
          setValidationStatus('valid');
          setValidationError('');
          setValidationErrorPosition(undefined);
        } else {
          setValidationStatus('error');
          setValidationError(data?.error || 'Syntaxe invalide');
          setValidationErrorPosition(data?.error_position);
        }
      } catch {
        setValidationStatus('idle');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [expression, token, fetchApi]);

  const loadFormulas = useCallback(async () => {
    if (!token) return;
    setLoadingFormulas(true);
    setLibraryError('');
    try {
      const res = await fetchApi('/formulas/custom');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Erreur ${res.status}`);
      }
      const json = await res.json();
      setFormulas(Array.isArray(json?.data) ? json.data : []);
    } catch (e) {
      setLibraryError(e instanceof Error ? e.message : 'Erreur chargement');
      setFormulas([]);
    } finally {
      setLoadingFormulas(false);
    }
  }, [token, fetchApi]);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setLoadingProducts(true);
    try {
      const res = await fetchApi('/products?limit=100');
      if (!res.ok) throw new Error('Erreur produits');
      const json = await res.json();
      setProducts(Array.isArray(json?.data) ? json.data : []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [token, fetchApi]);

  const loadVariables = useCallback(async () => {
    if (!token) return;
    setLoadingVars(true);
    try {
      const res = await fetchApi('/formulas/custom/variables');
      if (!res.ok) throw new Error('Erreur variables');
      const json = await res.json();
      const data = json?.data;
      if (data?.variables) setVariables(data.variables);
    } catch {
      setVariables([]);
    } finally {
      setLoadingVars(false);
    }
  }, [token, fetchApi]);

  useEffect(() => {
    if (token) {
      loadFormulas();
      loadProducts();
      loadVariables();
    }
  }, [token, loadFormulas, loadProducts, loadVariables]);

  const resetEditor = useCallback(() => {
    setName('');
    setDescription('');
    setExpression('');
    setEditingId(null);
    setEditorError('');
    setEditorSuccess('');
    setPreviewResult(null);
    setPreviewErrors(null);
    setValidationStatus('idle');
    setValidationError('');
    setValidationErrorPosition(undefined);
  }, []);

  const handlePreview = useCallback(async () => {
    const expr = expression.trim();
    if (!expr || !token) return;
    setPreviewing(true);
    setEditorError('');
    setPreviewResult(null);
    setPreviewErrors(null);
    try {
      const body: { expression: string; product_id?: string; scope: string; period_days?: number } = {
        expression: expr,
        scope: previewScope,
        period_days: 30,
      };
      if (previewScope === 'product' && previewProductId) body.product_id = previewProductId;
      const res = await fetchApi('/formulas/custom/preview', { method: 'POST', body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Erreur ${res.status}`);
      setPreviewResult(json?.data?.result ?? null);
      if (json?.data?.errors && Object.keys(json.data.errors).length > 0) {
        setPreviewErrors(json.data.errors);
      }
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : 'Erreur prévisualisation');
    } finally {
      setPreviewing(false);
    }
  }, [expression, token, previewProductId, previewScope, fetchApi]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedExpr = expression.trim();
    if (!trimmedName || !trimmedExpr || !token) {
      setEditorError('Nom et expression sont requis.');
      return;
    }
    setSaving(true);
    setEditorError('');
    setEditorSuccess('');
    try {
      const payload = { name: trimmedName, description: description.trim() || undefined, formula_expression: trimmedExpr };
      if (editingId) {
        const res = await fetchApi(`/formulas/custom/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `Erreur ${res.status}`);
        setEditorSuccess('Formule mise à jour.');
      } else {
        const res = await fetchApi('/formulas/custom', { method: 'POST', body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `Erreur ${res.status}`);
        setEditorSuccess('Formule créée.');
      }
      loadFormulas();
      resetEditor();
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  }, [name, description, expression, token, editingId, fetchApi, loadFormulas, resetEditor]);

  const handleEdit = useCallback((f: CustomFormula) => {
    setName(f.name);
    setDescription(f.description ?? '');
    setExpression(f.formula_expression);
    setEditingId(f.id);
    setEditorError('');
    setEditorSuccess('');
    setPreviewResult(null);
    setPreviewErrors(null);
    setActiveTab('editor');
  }, []);

  // Duplicate a formula (H-2)
  const handleDuplicate = useCallback(
    async (f: CustomFormula) => {
      if (!token) return;
      try {
        const payload = {
          name: `${f.name} (copie)`,
          description: f.description ?? undefined,
          formula_expression: f.formula_expression,
        };
        const res = await fetchApi('/formulas/custom', { method: 'POST', body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Erreur duplication');
        loadFormulas();
      } catch (e) {
        setLibraryError(e instanceof Error ? e.message : 'Erreur duplication');
      }
    },
    [token, fetchApi, loadFormulas]
  );

  // Delete with inline confirmation instead of native confirm() (M-2)
  const handleDeleteConfirm = useCallback(
    async (id: string) => {
      if (!token) return;
      setConfirmDeleteId(null);
      try {
        const res = await fetchApi(`/formulas/custom/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Erreur');
        loadFormulas();
        if (editingId === id) resetEditor();
      } catch (e) {
        setLibraryError(e instanceof Error ? e.message : 'Erreur suppression');
      }
    },
    [token, fetchApi, loadFormulas, editingId, resetEditor]
  );

  if (!token && isLoading) return null;
  if (!token) return null;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'editor', label: 'Éditeur' },
    { id: 'library', label: 'Bibliothèque' },
    { id: 'docs', label: 'Variables & Fonctions' },
  ];

  return (
    <div className="space-y-6" role="region" aria-label="Formules personnalisées">
      <div>
        <h1 className="text-xl font-medium text-charcoal">Formules personnalisées</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          Créez vos propres formules (variables stocks/ventes) comme dans Excel.
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t px-4 py-2 text-sm font-medium ${
              activeTab === tab.id ? 'border border-b-0 border-gray-200 bg-white text-green-deep' : 'text-charcoal/60 hover:bg-charcoal/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel: Éditeur */}
      <div
        id="panel-editor"
        role="tabpanel"
        aria-labelledby="tab-editor"
        hidden={activeTab !== 'editor'}
        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-4 text-sm font-medium text-charcoal">Créer / Modifier une formule</h2>
        {editorError && (
          <div className="mb-3 rounded-md bg-terracotta/10 px-3 py-2 text-sm text-terracotta" role="alert">
            {editorError}
          </div>
        )}
        {editorSuccess && (
          <div className="mb-3 rounded-md bg-green-deep/10 px-3 py-2 text-sm text-green-deep" role="status">
            {editorSuccess}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label htmlFor="cf-name" className="block text-sm font-medium text-charcoal/70">Nom de la formule *</label>
            <input
              id="cf-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Bénéfice net par produit"
              maxLength={255}
              className="mt-1 w-full rounded-md border border-charcoal/15 px-3 py-2 text-sm focus:border-green-deep focus:outline-none focus:ring-1 focus:ring-green-deep/20"
            />
          </div>
          <div>
            <label htmlFor="cf-desc" className="block text-sm font-medium text-charcoal/70">Description (optionnel)</label>
            <input
              id="cf-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description courte"
              maxLength={1000}
              className="mt-1 w-full rounded-md border border-charcoal/15 px-3 py-2 text-sm focus:border-green-deep focus:outline-none focus:ring-1 focus:ring-green-deep/20"
            />
          </div>
          <div>
            <label htmlFor="cf-expr" className="block text-sm font-medium text-charcoal/70">
              Expression de la formule *
              {/* Real-time validation indicator (H-1) */}
              {validationStatus === 'validating' && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-charcoal/50">
                  <Loader2 className="h-3 w-3 animate-spin" /> Validation…
                </span>
              )}
              {validationStatus === 'valid' && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-deep">
                  <CheckCircle2 className="h-3 w-3" /> Syntaxe valide
                </span>
              )}
              {validationStatus === 'error' && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-terracotta">
                  <XCircle className="h-3 w-3" /> Syntaxe invalide
                </span>
              )}
            </label>
            <textarea
              id="cf-expr"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="Ex: (PRIX_VENTE - PRIX_ACHAT) * QUANTITE"
              maxLength={2000}
              rows={4}
              aria-describedby={validationStatus === 'error' ? 'cf-expr-error' : undefined}
              className={`mt-1 w-full rounded-md border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 ${
                validationStatus === 'error'
                  ? 'border-terracotta/50 focus:border-terracotta focus:ring-terracotta/20'
                  : validationStatus === 'valid'
                  ? 'border-green-deep/40 focus:border-green-deep focus:ring-green-deep/20'
                  : 'border-charcoal/15 focus:border-green-deep focus:ring-green-deep/20'
              }`}
            />
            {/* Inline validation error with position (H-1 + H-4) */}
            {validationStatus === 'error' && validationError && (
              <p id="cf-expr-error" className="mt-1 text-xs text-terracotta" role="alert">
                {validationError}
                {validationErrorPosition !== undefined && (
                  <span className="ml-1 opacity-70">(position {validationErrorPosition + 1})</span>
                )}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cf-preview-product" className="block text-sm font-medium text-charcoal/70">Produit (prévisualisation)</label>
              <select
                id="cf-preview-product"
                value={previewProductId}
                onChange={(e) => setPreviewProductId(e.target.value)}
                className="mt-1 w-full rounded-md border border-charcoal/15 px-3 py-2 text-sm focus:border-green-deep focus:outline-none focus:ring-1 focus:ring-green-deep/20"
                disabled={loadingProducts}
              >
                <option value="">— Choisir un produit —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name ?? p.sku ?? p.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cf-preview-scope" className="block text-sm font-medium text-charcoal/70">Portée</label>
              <select
                id="cf-preview-scope"
                value={previewScope}
                onChange={(e) => setPreviewScope(e.target.value as 'all' | 'product')}
                className="mt-1 w-full rounded-md border border-charcoal/15 px-3 py-2 text-sm focus:border-green-deep focus:outline-none focus:ring-1 focus:ring-green-deep/20"
              >
                <option value="product">Produit sélectionné</option>
                <option value="all">Tous les produits</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!expression.trim() || previewing || validationStatus === 'error'}
              className="flex items-center gap-2 rounded-md border border-charcoal/15 bg-white px-4 py-2 text-sm font-medium text-charcoal/70 hover:bg-cream/30 disabled:opacity-50"
            >
              {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Prévisualiser
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || !expression.trim() || saving || validationStatus === 'error'}
              className="flex items-center gap-2 rounded-md bg-green-deep px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Mettre à jour' : 'Sauvegarder'}
            </button>
            <button
              type="button"
              onClick={resetEditor}
              className="flex items-center gap-2 rounded-md border border-charcoal/15 bg-white px-4 py-2 text-sm font-medium text-charcoal/70 hover:bg-cream/30"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </button>
          </div>
          {previewResult !== null && (
            <div className="rounded-md border border-charcoal/8 bg-cream/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-charcoal/50">Prévisualisation — résultat non sauvegardé</p>
              <pre className="mt-1 whitespace-pre-wrap font-mono text-sm text-charcoal">{formatPreviewResult(previewResult)}</pre>
              {previewErrors && Object.keys(previewErrors).length > 0 && (
                <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <strong>Produits en erreur :</strong>
                  <ul className="mt-1 list-inside list-disc">
                    {Object.entries(previewErrors).map(([prod, err]) => (
                      <li key={prod}><span className="font-medium">{prod}</span> — {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Panel: Bibliothèque */}
      <div
        id="panel-library"
        role="tabpanel"
        aria-labelledby="tab-library"
        hidden={activeTab !== 'library'}
        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-4 text-sm font-medium text-charcoal">Mes formules sauvegardées</h2>
        {libraryError && (
          <div className="mb-3 rounded-md bg-terracotta/10 px-3 py-2 text-sm text-terracotta" role="alert">
            {libraryError}
          </div>
        )}
        {loadingFormulas ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        ) : formulas.length === 0 ? (
          <p className="text-charcoal/50">Aucune formule personnalisée. Créez-en une dans l&apos;onglet Éditeur.</p>
        ) : (
          <ul className="space-y-4">
            {formulas.map((f) => (
              <li key={f.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-charcoal">{f.name}</h3>
                  {/* Date de création (H-3) */}
                  {f.created_at && (
                    <span className="shrink-0 text-xs text-charcoal/40">{formatDate(f.created_at)}</span>
                  )}
                </div>
                {f.description && <p className="mt-1 text-sm text-charcoal/60">{f.description}</p>}
                <p className="mt-1 font-mono text-xs text-charcoal/60">{f.formula_expression}</p>
                {f.variables_used?.length > 0 && (
                  <p className="mt-1 text-xs text-charcoal/50">Variables : {f.variables_used.join(', ')}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(f)}
                    className="flex items-center gap-1 rounded border border-charcoal/15 bg-white px-3 py-1.5 text-sm text-charcoal/70 hover:bg-cream/30"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </button>
                  {/* Bouton Dupliquer (H-2) */}
                  <button
                    type="button"
                    onClick={() => handleDuplicate(f)}
                    className="flex items-center gap-1 rounded border border-charcoal/15 bg-white px-3 py-1.5 text-sm text-charcoal/70 hover:bg-cream/30"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Dupliquer
                  </button>
                  {/* Confirmation inline pour suppression (M-2) */}
                  {confirmDeleteId === f.id ? (
                    <span className="flex items-center gap-1 text-sm text-terracotta">
                      <span className="text-charcoal/60">Confirmer ?</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteConfirm(f.id)}
                        className="rounded border border-terracotta/40 bg-terracotta/10 px-2 py-1 text-xs font-medium text-terracotta hover:bg-terracotta/20"
                      >
                        Oui, supprimer
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded border border-charcoal/15 bg-white px-2 py-1 text-xs font-medium text-charcoal/60 hover:bg-cream/30"
                      >
                        Annuler
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(f.id)}
                      className="flex items-center gap-1 rounded border border-terracotta/30 bg-terracotta/10 px-3 py-1.5 text-sm text-terracotta hover:bg-terracotta/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Panel: Variables & Fonctions */}
      <div
        id="panel-docs"
        role="tabpanel"
        aria-labelledby="tab-docs"
        hidden={activeTab !== 'docs'}
        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-2 text-sm font-medium text-charcoal">Variables disponibles</h2>
        <p className="mb-4 text-sm text-charcoal/60">
          Utilisez ces variables dans vos formules ; elles sont remplacées par les valeurs réelles.
        </p>
        {loadingVars ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : variables.length > 0 ? (
          <ul className="mb-6 grid gap-2 sm:grid-cols-2">
            {variables.map((v) => (
              <li key={v.name} className="rounded border border-gray-200 p-2 text-sm">
                <code className="font-mono text-green-deep">{v.name}</code>
                <span className="ml-2 text-charcoal/60">— {v.description}</span>
                {v.requiresProduct && <span className="ml-1 text-xs text-charcoal/50">(produit requis)</span>}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mb-6 space-y-1 text-sm text-charcoal/60">
            {['STOCK_ACTUEL', 'PRIX_ACHAT', 'PRIX_VENTE', 'QUANTITE', 'DELAI_LIVRAISON', 'VENTES_7J', 'VENTES_30J', 'CONSOMMATION_MOYENNE'].map((n) => (
              <li key={n}><code className="text-green-deep">{n}</code></li>
            ))}
          </ul>
        )}
        <h2 className="mb-2 text-sm font-medium text-charcoal">Fonctions</h2>
        <p className="mb-2 text-sm text-charcoal/60">Fonctions mathématiques utilisables :</p>
        <p className="mb-4 font-mono text-sm text-charcoal/70">{DOC_FUNCTIONS.join(', ')}</p>
        <h2 className="mb-2 text-sm font-medium text-charcoal">Exemples</h2>
        <ul className="space-y-2 text-sm">
          {DOC_EXAMPLES.map((ex) => (
            <li key={ex.expr} className="rounded border border-charcoal/8 bg-cream/30 p-2">
              <code className="text-green-deep">{ex.expr}</code>
              <span className="ml-2 text-charcoal/60">— {ex.desc}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Note IF() :</strong> IF évalue les deux branches. Pour éviter les divisions par zéro, préférez{' '}
          <code>STOCK_ACTUEL / MAX(CONSOMMATION_MOYENNE, 0.001)</code> à <code>IF(CONSO &gt; 0, STOCK/CONSO, 0)</code>.
        </div>
      </div>
    </div>
  );
}
