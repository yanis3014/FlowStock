'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, RotateCcw, Eye, Pencil, Trash2, Loader2 } from 'lucide-react';
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

const DOC_FUNCTIONS = ['SUM', 'AVG', 'MAX', 'MIN', 'COUNT', 'ABS', 'ROUND', 'CEIL', 'FLOOR', 'SQRT', 'POW', 'IF'];
const DOC_EXAMPLES = [
  { expr: '(PRIX_VENTE - PRIX_ACHAT) * QUANTITE', desc: 'Bénéfice total en stock' },
  { expr: '(PRIX_VENTE - PRIX_ACHAT) / PRIX_VENTE * 100', desc: 'Marge en %' },
  { expr: 'IF(STOCK_ACTUEL < VENTES_7J, 1, 0)', desc: 'Alerte stock faible (1=oui)' },
];

function formatPreviewResult(result: unknown): string {
  if (result == null) return '—';
  if (typeof result === 'object') return JSON.stringify(result);
  return String(result);
}

export default function CustomFormulasPage() {
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
  const [libraryError, setLibraryError] = useState('');

  useEffect(() => {
    if (!token && !isLoading) {
      router.push('/login?returnUrl=/custom-formulas');
      return;
    }
  }, [token, isLoading, router]);

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
      const res = await fetchApi('/products?limit=200');
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
  }, []);

  const handlePreview = useCallback(async () => {
    const expr = expression.trim();
    if (!expr || !token) return;
    setPreviewing(true);
    setEditorError('');
    setPreviewResult(null);
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
    setActiveTab('editor');
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Supprimer cette formule ?')) return;
      if (!token) return;
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
        <h1 className="text-xl font-semibold text-gray-800">Formules personnalisées</h1>
        <p className="mt-1 text-sm text-gray-600">
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
              activeTab === tab.id ? 'border border-b-0 border-gray-200 bg-white text-primary' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel: Editor */}
      <div
        id="panel-editor"
        role="tabpanel"
        aria-labelledby="tab-editor"
        hidden={activeTab !== 'editor'}
        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-4 text-sm font-semibold text-gray-800">Créer / Modifier une formule</h2>
        {editorError && (
          <div className="mb-3 rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
            {editorError}
          </div>
        )}
        {editorSuccess && (
          <div className="mb-3 rounded-md bg-success/10 px-3 py-2 text-sm text-success" role="status">
            {editorSuccess}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label htmlFor="cf-name" className="block text-sm font-medium text-gray-700">Nom de la formule *</label>
            <input
              id="cf-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Bénéfice net par produit"
              maxLength={255}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="cf-desc" className="block text-sm font-medium text-gray-700">Description (optionnel)</label>
            <input
              id="cf-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description courte"
              maxLength={1000}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="cf-expr" className="block text-sm font-medium text-gray-700">Expression de la formule *</label>
            <textarea
              id="cf-expr"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="Ex: (PRIX_VENTE - PRIX_ACHAT) * QUANTITE"
              maxLength={2000}
              rows={4}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cf-preview-product" className="block text-sm font-medium text-gray-700">Produit (prévisualisation)</label>
              <select
                id="cf-preview-product"
                value={previewProductId}
                onChange={(e) => setPreviewProductId(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={loadingProducts}
              >
                <option value="">— Choisir un produit —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name ?? p.sku ?? p.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cf-preview-scope" className="block text-sm font-medium text-gray-700">Portée</label>
              <select
                id="cf-preview-scope"
                value={previewScope}
                onChange={(e) => setPreviewScope(e.target.value as 'all' | 'product')}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
              disabled={!expression.trim() || previewing}
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Prévisualiser
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || !expression.trim() || saving}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Mettre à jour' : 'Sauvegarder'}
            </button>
            <button
              type="button"
              onClick={resetEditor}
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </button>
          </div>
          {previewResult !== null && (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-700">Résultat prévisualisation :</p>
              <p className="mt-1 font-mono text-gray-800">{formatPreviewResult(previewResult)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel: Library */}
      <div
        id="panel-library"
        role="tabpanel"
        aria-labelledby="tab-library"
        hidden={activeTab !== 'library'}
        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-4 text-sm font-semibold text-gray-800">Mes formules sauvegardées</h2>
        {libraryError && (
          <div className="mb-3 rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
            {libraryError}
          </div>
        )}
        {loadingFormulas ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        ) : formulas.length === 0 ? (
          <p className="text-gray-500">Aucune formule personnalisée. Créez-en une dans l’onglet Éditeur.</p>
        ) : (
          <ul className="space-y-4">
            {formulas.map((f) => (
              <li key={f.id} className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-800">{f.name}</h3>
                {f.description && <p className="mt-1 text-sm text-gray-600">{f.description}</p>}
                <p className="mt-1 font-mono text-xs text-gray-600">{f.formula_expression}</p>
                {f.variables_used?.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">Variables : {f.variables_used.join(', ')}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(f)}
                    className="flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(f.id)}
                    className="flex items-center gap-1 rounded border border-error/30 bg-error/10 px-3 py-1.5 text-sm text-error hover:bg-error/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Panel: Variables & Functions */}
      <div
        id="panel-docs"
        role="tabpanel"
        aria-labelledby="tab-docs"
        hidden={activeTab !== 'docs'}
        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-2 text-sm font-semibold text-gray-800">Variables disponibles</h2>
        <p className="mb-4 text-sm text-gray-600">
          Utilisez ces variables dans vos formules ; elles sont remplacées par les valeurs réelles.
        </p>
        {loadingVars ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : variables.length > 0 ? (
          <ul className="mb-6 grid gap-2 sm:grid-cols-2">
            {variables.map((v) => (
              <li key={v.name} className="rounded border border-gray-200 p-2 text-sm">
                <code className="font-mono text-primary">{v.name}</code>
                <span className="ml-2 text-gray-600">— {v.description}</span>
                {v.requiresProduct && <span className="ml-1 text-xs text-gray-500">(produit requis)</span>}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mb-6 space-y-1 text-sm text-gray-600">
            {['STOCK_ACTUEL', 'PRIX_ACHAT', 'PRIX_VENTE', 'QUANTITE', 'DELAI_LIVRAISON', 'VENTES_7J', 'VENTES_30J', 'CONSOMMATION_MOYENNE'].map((n) => (
              <li key={n}><code className="text-primary">{n}</code></li>
            ))}
          </ul>
        )}
        <h2 className="mb-2 text-sm font-semibold text-gray-800">Fonctions</h2>
        <p className="mb-2 text-sm text-gray-600">Fonctions mathématiques utilisables :</p>
        <p className="mb-4 font-mono text-sm text-gray-700">{DOC_FUNCTIONS.join(', ')}</p>
        <h2 className="mb-2 text-sm font-semibold text-gray-800">Exemples</h2>
        <ul className="space-y-2 text-sm">
          {DOC_EXAMPLES.map((ex) => (
            <li key={ex.expr} className="rounded border border-gray-100 bg-gray-50/50 p-2">
              <code className="text-primary">{ex.expr}</code>
              <span className="ml-2 text-gray-600">— {ex.desc}</span>
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
