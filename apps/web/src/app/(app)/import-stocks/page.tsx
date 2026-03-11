'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const PRODUCT_FIELDS = [
  { value: '', label: '— Ignorer' },
  { value: 'sku', label: 'SKU (obligatoire)' },
  { value: 'name', label: 'Nom (obligatoire)' },
  { value: 'description', label: 'Description' },
  { value: 'unit', label: 'Unité' },
  { value: 'quantity', label: 'Quantité' },
  { value: 'min_quantity', label: 'Quantité min.' },
  { value: 'location_name', label: 'Emplacement' },
  { value: 'supplier_name', label: 'Fournisseur' },
  { value: 'purchase_price', label: 'Prix d\'achat' },
  { value: 'selling_price', label: 'Prix de vente' },
  { value: 'lead_time_days', label: 'Délai livraison (jours)' },
] as const;

type ProductField = (typeof PRODUCT_FIELDS)[number]['value'];

interface ImportPreview {
  columns: string[];
  sampleRows: Record<string, string>[];
  suggestedMapping: Record<string, string>;
}

interface ImportError {
  row: number;
  value?: string;
  message: string;
}

interface ImportResult {
  imported: number;
  errors: ImportError[];
  ignored: number;
  totalRows: number;
}

export default function ImportStocksPage() {
  const { token } = useAuth();
  const { fetchApi } = useApi();
  const searchParams = useSearchParams();
  const fromOnboarding = searchParams.get('from') === 'onboarding';
  const prefillParam = searchParams.get('prefill');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prefillIngredients, setPrefillIngredients] = useState<Array<{ name: string; qty?: string }>>([]);
  const [prefillCreating, setPrefillCreating] = useState(false);
  const [prefillCreated, setPrefillCreated] = useState(0);

  useEffect(() => {
    if (prefillParam && fromOnboarding) {
      try {
        const parsed = JSON.parse(decodeURIComponent(prefillParam)) as Array<{ name: string; qty?: string }>;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPrefillIngredients(parsed);
        }
      } catch {
        /* ignore */
      }
    }
  }, [prefillParam, fromOnboarding]);

  const createFromPrefill = useCallback(async () => {
    if (!token || prefillIngredients.length === 0) return;
    setPrefillCreating(true);
    setPrefillCreated(0);
    let created = 0;
    for (let idx = 0; idx < prefillIngredients.length; idx++) {
      const ing = prefillIngredients[idx];
      try {
        const baseSku = ing.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'ing';
        const sku = `${baseSku}-${idx}-${Date.now().toString(36)}`;
        const qtyMatch = ing.qty?.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|L|ml|piece|pièce|pièces)?$/i);
        const quantity = qtyMatch ? parseFloat(qtyMatch[1].replace(',', '.')) || 0 : 0;
        const unitStr = qtyMatch?.[2]?.toLowerCase();
        const unit = unitStr === 'g' || unitStr === 'kg' ? 'kg' : unitStr === 'ml' || unitStr === 'l' ? 'liter' : 'piece';
        const body = {
          sku,
          name: ing.name.trim(),
          quantity,
          unit,
        };
        const res = await fetchApi('/products', { method: 'POST', body: JSON.stringify(body) });
        if (res.ok) {
          created++;
          setPrefillCreated(created);
        }
      } catch {
        /* skip */
      }
    }
    setPrefillCreating(false);
    if (created > 0) toast.success(`${created} produit(s) créé(s) à partir des ingrédients détectés.`);
  }, [token, fetchApi, prefillIngredients]);

  const [step, setStep] = useState<'upload' | 'preview' | 'report'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, ProductField>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const downloadTemplate = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const res = await fetchApi('/products/import/template');
      if (!res.ok) throw new Error('Téléchargement impossible');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products-import-template.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Template téléchargé.');
    } catch {
      setError('Impossible de télécharger le template.');
    }
  }, [token, fetchApi]);

  const validateFile = useCallback((f: File): string | null => {
    const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `Format non accepté. Utilisez : ${ACCEPTED_EXTENSIONS.join(', ')}`;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return `Fichier trop volumineux (max ${MAX_FILE_SIZE_MB} Mo).`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      const err = validateFile(selectedFile);
      if (err) {
        setError(err);
        return;
      }
      setError('');
      setFile(selectedFile);
      setLoading(true);
      try {
        const form = new FormData();
        form.append('file', selectedFile);
        const res = await fetchApi('/products/import/preview', {
          method: 'POST',
          body: form,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          const msg = res.status === 403 ? 'Session expirée. Veuillez réessayer en sélectionnant à nouveau le fichier.' : (j?.error || 'Erreur lors de l\'analyse du fichier');
          throw new Error(msg);
        }
        const json = await res.json();
        if (!json?.success || !json?.data) throw new Error('Réponse invalide');
        const data = json.data as ImportPreview;
        setPreview(data);
        const initialMapping: Record<string, ProductField> = {};
        data.columns.forEach((col) => {
          const suggested = data.suggestedMapping[col];
          initialMapping[col] = (suggested as ProductField) || '';
        });
        setMapping(initialMapping);
        setStep('preview');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    },
    [fetchApi, validateFile]
  );

  const canImport = useCallback(() => {
    if (!mapping || !preview) return false;
    const values = new Set(Object.values(mapping).filter(Boolean));
    return values.has('sku') && values.has('name');
  }, [mapping, preview]);

  const runImport = useCallback(async () => {
    if (!file || !preview || !canImport()) return;
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const mappingForApi: Record<string, string> = {};
      Object.entries(mapping).forEach(([col, field]) => {
        if (field) mappingForApi[col] = field;
      });
      form.append('mapping', JSON.stringify(mappingForApi));
      const res = await fetchApi('/products/import', {
        method: 'POST',
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = res.status === 403 ? 'Session expirée. Veuillez réessayer en sélectionnant à nouveau le fichier.' : (json?.error || 'Import échoué');
        throw new Error(msg);
      }
      if (!json?.success || !json?.data) throw new Error('Réponse invalide');
      setResult(json.data as ImportResult);
      setStep('report');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  }, [file, preview, mapping, canImport, fetchApi]);

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setMapping({});
    setResult(null);
    setStep('upload');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-green-deep">Import des stocks</h1>
        <div className="flex gap-3">
          {fromOnboarding && (
            <Link
              href="/onboarding"
              className="text-sm font-medium text-green-deep hover:underline"
            >
              ← Retour à l&apos;onboarding
            </Link>
          )}
          <Link
            href="/stocks"
            className="text-sm font-medium text-green-deep hover:underline"
          >
            ← Retour aux stocks
          </Link>
        </div>
      </div>

      <p className="mb-6 text-sm text-gray-warm">
        Importez un fichier CSV ou Excel pour créer vos produits en lot. Le fichier doit contenir au minimum les colonnes <strong>SKU</strong> et <strong>Nom</strong>.
      </p>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-alert/30 bg-red-alert/10 px-4 py-2 text-sm text-red-alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {step === 'upload' && fromOnboarding && prefillIngredients.length > 0 && (
        <div className="mb-6 rounded-2xl border border-green-deep/20 bg-green-deep/5 p-6">
          <h2 className="font-display text-lg font-semibold text-green-deep">Ingrédients détectés depuis l&apos;onboarding</h2>
          <p className="mt-1 text-sm text-gray-warm">
            Créez des produits à partir des ingrédients détectés à l&apos;étape 1.
          </p>
          <ul className="mt-3 space-y-2">
            {prefillIngredients.map((ing, idx) => (
              <li key={idx} className="flex items-center justify-between rounded-lg border border-green-deep/10 bg-white px-4 py-2 text-sm">
                <span className="font-medium text-charcoal">{ing.name}</span>
                <span className="text-gray-warm">{ing.qty ?? '—'}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={createFromPrefill}
            disabled={prefillCreating}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-mid px-4 py-2 font-display text-sm font-bold text-white disabled:opacity-70"
          >
            {prefillCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Création… ({prefillCreated}/{prefillIngredients.length})
              </>
            ) : (
              'Créer ces produits'
            )}
          </button>
        </div>
      )}

      {step === 'upload' && (
        <div className="rounded-2xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-green-deep">1. Télécharger le template</h2>
              <p className="mt-1 text-sm text-gray-warm">
                Utilisez notre modèle CSV pour remplir vos produits (SKU, nom, quantité, etc.).
              </p>
              <button
                type="button"
                onClick={downloadTemplate}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-green-deep/30 bg-white px-4 py-2 font-display text-sm font-semibold text-green-deep hover:bg-cream/50"
              >
                <Download className="h-4 w-4" />
                Télécharger le template CSV
              </button>
            </div>
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-green-deep">2. Choisir un fichier</h2>
              <p className="mt-1 text-sm text-gray-warm">
                CSV ou Excel (.xlsx, .xls), max {MAX_FILE_SIZE_MB} Mo.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                className="mt-3 hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
              <div
                className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-green-deep/20 bg-cream/50 py-10 hover:border-green-mid/50"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                onClick={() => !loading && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              >
                {loading ? (
                  <Loader2 className="h-10 w-10 animate-spin text-green-mid" />
                ) : (
                  <>
                    <Upload className="mb-2 h-10 w-10 text-green-deep/60" />
                    <p className="font-display text-sm font-semibold text-green-deep">
                      Glissez un fichier ici ou cliquez pour parcourir
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 rounded-lg bg-green-mid px-4 py-2 font-display text-sm font-bold text-white hover:bg-green-deep"
                    >
                      Parcourir
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-green-deep/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-green-deep">Aperçu et mapping</h2>
              <span className="text-sm text-gray-warm">{file?.name}</span>
            </div>
            <p className="mt-1 text-sm text-gray-warm">
              Associez chaque colonne du fichier à un champ produit. SKU et Nom sont obligatoires.
            </p>
            <p className="mt-2 text-xs text-gray-warm">
              Emplacement et fournisseur : si le nom n&apos;existe pas déjà dans votre base, il sera ignoré (produit importé sans lien).
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border border-cream-dark text-left text-sm">
                <thead>
                  <tr className="bg-cream/50">
                    <th className="border-b border-cream-dark px-3 py-2 font-semibold text-green-deep">Colonne fichier</th>
                    <th className="border-b border-cream-dark px-3 py-2 font-semibold text-green-deep">Champ produit</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.columns.map((col) => (
                    <tr key={col} className="border-b border-cream-dark">
                      <td className="px-3 py-2">{col || '(vide)'}</td>
                      <td className="px-3 py-2">
                        <select
                          value={mapping[col] ?? ''}
                          onChange={(e) =>
                            setMapping((prev) => ({ ...prev, [col]: e.target.value as ProductField }))
                          }
                          className="w-full max-w-[200px] rounded border border-cream-dark bg-white px-2 py-1.5 text-sm"
                        >
                          {PRODUCT_FIELDS.map((opt) => (
                            <option key={opt.value || 'ignore'} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <h3 className="font-display text-sm font-semibold text-green-deep">Aperçu des données (20 premières lignes)</h3>
              <div className="mt-2 overflow-x-auto rounded-lg border border-cream-dark">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="bg-cream/50">
                      {preview.columns.map((c) => (
                        <th key={c} className="whitespace-nowrap border-b border-cream-dark px-2 py-1.5 font-medium">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sampleRows.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-b border-cream-dark/50">
                        {preview.columns.map((c) => (
                          <td key={c} className="max-w-[120px] truncate border-r border-cream-dark/50 px-2 py-1">
                            {row[c] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={runImport}
                disabled={!canImport() || loading}
                className="inline-flex items-center gap-2 rounded-lg bg-green-mid px-4 py-2 font-display text-sm font-bold text-white hover:bg-green-deep disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                Lancer l&apos;import
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-green-deep/30 px-4 py-2 font-display text-sm font-semibold text-green-deep hover:bg-cream/50"
              >
                Changer de fichier
              </button>
            </div>
            {!canImport() && (
              <p className="mt-2 text-sm text-orange-warn">
                Associez au moins une colonne à <strong>SKU</strong> et une à <strong>Nom</strong> pour lancer l&apos;import.
              </p>
            )}
          </div>
        </div>
      )}

      {step === 'report' && result && (
        <div className="rounded-2xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-green-deep">Rapport d&apos;import</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-green-bright/30 bg-green-light/20 p-4">
              <p className="text-2xl font-bold text-green-deep">{result.imported}</p>
              <p className="text-sm text-gray-warm">Importés</p>
            </div>
            <div className="rounded-lg border border-cream-dark bg-cream/30 p-4">
              <p className="text-2xl font-bold text-charcoal">{result.totalRows}</p>
              <p className="text-sm text-gray-warm">Lignes totales</p>
            </div>
            <div className="rounded-lg border border-cream-dark bg-cream/30 p-4">
              <p className="text-2xl font-bold text-charcoal">{result.ignored}</p>
              <p className="text-sm text-gray-warm">Ignorées</p>
            </div>
            <div className="rounded-lg border border-orange-warn/30 bg-orange-warn/10 p-4">
              <p className="text-2xl font-bold text-orange-warn">{result.errors.length}</p>
              <p className="text-sm text-gray-warm">Erreurs</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-6">
              <h3 className="font-display text-sm font-semibold text-charcoal">Détail des erreurs</h3>
              <ul className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-cream-dark">
                {result.errors.map((err, i) => (
                  <li key={i} className="border-b border-cream-dark/50 px-3 py-2 text-sm last:border-0">
                    <span className="font-medium">Ligne {err.row}</span>
                    {err.value != null && <span className="text-gray-warm"> — {String(err.value).slice(0, 50)}</span>}
                    : {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-green-mid px-4 py-2 font-display text-sm font-bold text-white hover:bg-green-deep"
            >
              Nouvel import
            </button>
            <Link
              href="/stocks"
              className="rounded-lg border border-green-deep/30 px-4 py-2 font-display text-sm font-semibold text-green-deep hover:bg-cream/50"
            >
              Voir les stocks
            </Link>
            {fromOnboarding && (
              <Link
                href="/onboarding"
                className="rounded-lg border border-green-deep/30 px-4 py-2 font-display text-sm font-semibold text-green-deep hover:bg-cream/50"
              >
                Retour à l&apos;onboarding
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
