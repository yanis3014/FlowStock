'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { Skeleton } from '@/components/ui/Skeleton';

interface PredefinedFormula {
  id: string;
  name: string;
  description: string | null;
  formula_expression: string;
  variables_used: string[];
}

interface Product {
  id: string;
  name?: string;
  sku?: string;
}

interface ExecuteResult {
  result: number | Record<string, number> | null;
  unit?: string;
  formula_name?: string;
}

const FORMULA_LABELS: Record<string, string> = {
  consommation_moyenne: 'Consommation moyenne',
  stock_securite: 'Stock de sécurité',
  point_commande: 'Point de commande',
  taux_rotation: 'Taux de rotation',
  jours_stock_restant: 'Jours de stock restant',
  cout_stock_moyen: 'Coût stock moyen',
  valeur_stock: 'Valeur stock',
  marge_beneficiaire: 'Marge bénéficiaire',
};

const DOC_ITEMS = [
  { name: 'Consommation moyenne', desc: 'Moyenne des ventes quotidiennes sur la période. Nécessite un produit.' },
  { name: 'Stock de sécurité', desc: 'CONSOMMATION_MOYENNE × DELAI_LIVRAISON × 1,5. Nécessite un produit.' },
  { name: 'Point de commande', desc: 'STOCK_SECURITE + (CONSOMMATION_MOYENNE × DELAI_LIVRAISON). Nécessite un produit.' },
  { name: 'Taux de rotation', desc: 'VENTES_PERIODE / STOCK_MOYEN.' },
  { name: 'Jours de stock restant', desc: 'STOCK_ACTUEL / CONSOMMATION_QUOTIDIENNE. Nécessite un produit.' },
  { name: 'Coût stock moyen', desc: 'SOMME(quantité × prix_achat) / SOMME(quantité).' },
  { name: 'Valeur stock', desc: 'SOMME(quantité × prix_achat).' },
  { name: 'Marge bénéficiaire', desc: '(prix_vente - prix_achat) / prix_vente × 100.' },
];

function formatResult(result: number | Record<string, number> | null, unit?: string): string {
  if (result == null) return '∞';
  if (typeof result === 'object') return JSON.stringify(result);
  const u = unit ? ` ${unit}` : '';
  return `${result}${u}`;
}

export default function FormulasPage() {
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const router = useRouter();
  const [formulas, setFormulas] = useState<PredefinedFormula[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState('');
  const [selectedFormula, setSelectedFormula] = useState<PredefinedFormula | null>(null);
  const [productId, setProductId] = useState('');
  const [periodDays, setPeriodDays] = useState(30);
  const [scope, setScope] = useState<'all' | 'product'>('all');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [resultError, setResultError] = useState('');
  const [docOpen, setDocOpen] = useState(true);

  useEffect(() => {
    if (!token && !isLoading) {
      router.push('/login?returnUrl=/formulas');
      return;
    }
  }, [token, isLoading, router]);

  const loadFormulas = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi('/formulas/predefined');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Erreur ${res.status}`);
      }
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) throw new Error('Données invalides');
      setFormulas(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement formules');
      setFormulas([]);
    } finally {
      setLoading(false);
    }
  }, [token, fetchApi]);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setLoadingProducts(true);
    try {
      const res = await fetchApi('/products?limit=200');
      if (!res.ok) throw new Error('Erreur chargement produits');
      const json = await res.json();
      setProducts(Array.isArray(json?.data) ? json.data : []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [token, fetchApi]);

  useEffect(() => {
    if (token) loadFormulas();
  }, [token, loadFormulas]);

  useEffect(() => {
    if (token && selectedFormula) loadProducts();
  }, [token, selectedFormula, loadProducts]);

  const handleSelectFormula = useCallback((formula: PredefinedFormula) => {
    setSelectedFormula(formula);
    setProductId('');
    setResult(null);
    setResultError('');
  }, []);

  const handleCancelParams = useCallback(() => {
    setSelectedFormula(null);
    setResult(null);
    setResultError('');
  }, []);

  const handleExecute = useCallback(async () => {
    if (!selectedFormula || !token) return;
    setExecuting(true);
    setResultError('');
    setResult(null);
    try {
      const body: { product_id?: string; period_days: number; scope: string } = {
        period_days: periodDays,
        scope,
      };
      if (scope === 'product' && productId) body.product_id = productId;
      const res = await fetchApi(`/formulas/${selectedFormula.id}/execute`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || `Erreur ${res.status}`);
      }
      if (!json.success) throw new Error(json?.error || 'Erreur exécution');
      setResult(json.data as ExecuteResult);
    } catch (e) {
      setResultError(e instanceof Error ? e.message : 'Erreur exécution');
    } finally {
      setExecuting(false);
    }
  }, [selectedFormula, token, productId, periodDays, scope, fetchApi]);

  const canExecute = selectedFormula && (scope !== 'product' || productId);

  if (!token && isLoading) return null;
  if (!token) return null;

  return (
    <div className="space-y-6" role="region" aria-label="Formules de calcul prédéfinies">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Formules de calcul prédéfinies</h1>
        <p className="mt-1 text-sm text-gray-600">
          Utilisez les formules prédéfinies pour des calculs standards (consommation moyenne, stock de sécurité, etc.).
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" aria-labelledby="formulas-heading">
        <h2 id="formulas-heading" className="mb-4 text-sm font-semibold text-gray-800">
          Formules disponibles
        </h2>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : formulas.length === 0 ? (
          <p className="text-gray-500">Aucune formule disponible.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {formulas.map((f) => (
              <div
                key={f.id}
                className={`rounded-lg border p-4 transition-colors ${
                  selectedFormula?.id === f.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                }`}
              >
                <h3 className="font-medium text-gray-800">
                  {FORMULA_LABELS[f.name] ?? f.name}
                </h3>
                {f.description && <p className="mt-1 text-sm text-gray-600">{f.description}</p>}
                {f.variables_used?.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Variables : {f.variables_used.join(', ')}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => handleSelectFormula(f)}
                  className="mt-3 flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                  aria-label={`Calculer avec ${FORMULA_LABELS[f.name] ?? f.name}`}
                >
                  <Calculator className="h-4 w-4" />
                  Calculer
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedFormula && (
        <section
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          aria-labelledby="params-heading"
        >
          <h2 id="params-heading" className="mb-4 text-sm font-semibold text-gray-800">
            Paramètres du calcul
          </h2>
          <p className="mb-4 font-medium text-gray-700">
            Formule sélectionnée : {FORMULA_LABELS[selectedFormula.name] ?? selectedFormula.name}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="formulas-product" className="block text-sm font-medium text-gray-700">
                Produit {scope === 'product' ? '(requis)' : '(optionnel)'}
              </label>
              <select
                id="formulas-product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={loadingProducts}
              >
                <option value="">— Choisir un produit —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? p.sku ?? p.id} {p.sku ? `(${p.sku})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="formulas-period" className="block text-sm font-medium text-gray-700">
                Période (jours)
              </label>
              <input
                id="formulas-period"
                type="number"
                min={1}
                max={365}
                value={periodDays}
                onChange={(e) => setPeriodDays(Number(e.target.value) || 30)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="formulas-scope" className="block text-sm font-medium text-gray-700">
                Portée
              </label>
              <select
                id="formulas-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value as 'all' | 'product')}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Tous les produits</option>
                <option value="product">Produit sélectionné</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleExecute}
                disabled={!canExecute || executing}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Lancer le calcul"
              >
                {executing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Calculator className="h-4 w-4" aria-hidden />
                )}
                Calculer
              </button>
              <button
                type="button"
                onClick={handleCancelParams}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </section>
      )}

      {(result !== null || resultError) && selectedFormula && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" aria-live="polite">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">Résultat</h2>
          {resultError ? (
            <div className="rounded-md bg-error/10 px-4 py-3 text-sm text-error" role="alert">
              {resultError}
            </div>
          ) : result ? (
            <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <span className="text-lg font-semibold text-gray-800">
                {formatResult(result.result, result.unit)}
              </span>
            </div>
          ) : null}
        </section>
      )}

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setDocOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-gray-800 hover:bg-gray-50"
          aria-expanded={docOpen}
          aria-controls="formulas-doc"
        >
          Documentation des formules
          {docOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        <div id="formulas-doc" className="border-t border-gray-200 px-4 py-3" hidden={!docOpen}>
          <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
            {DOC_ITEMS.map((item) => (
              <li key={item.name}>
                <strong>{item.name}</strong> — {item.desc}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
