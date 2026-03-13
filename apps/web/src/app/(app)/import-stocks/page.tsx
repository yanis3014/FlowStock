'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';
import { FileSpreadsheet, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { transformCsvWithAI } from './actions';
import type { CsvTransformResult } from '@/types/csv-import';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type Step = 'IDLE' | 'TRANSFORMING' | 'REVIEW' | 'IMPORTING' | 'SUCCESS' | 'ERROR';

interface ParsedFileInfo {
  fileName: string;
  fileSize: number;
  columns: string[];
  rowCount: number;
  sampleRows: Record<string, string>[];
}

function parseCsvForPreview(content: string): ParsedFileInfo | null {
  const text = content.replace(/^\uFEFF/, '').trim();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null;
  const first = lines[0];
  const delimiter = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const columns = first.split(delimiter).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(delimiter).map((c) => c.trim()));
  const sampleRows: Record<string, string>[] = rows.slice(0, 5).map((row) => {
    const obj: Record<string, string> = {};
    columns.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    return obj;
  });
  return {
    fileName: '',
    fileSize: 0,
    columns,
    rowCount: rows.length,
    sampleRows,
  };
}

interface ImportResultBackend {
  imported: number;
  errors: { row: number; value?: string; message: string }[];
  ignored: number;
  totalRows: number;
}

function confidenceBadgeClass(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'bg-green-bright/15 text-green-deep border-green-bright/30';
    case 'medium':
      return 'bg-gold/15 text-charcoal border-gold/30';
    case 'low':
      return 'bg-terracotta/15 text-terracotta border-terracotta/30';
    default:
      return 'bg-charcoal/10 text-charcoal border-charcoal/20';
  }
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
        if (Array.isArray(parsed) && parsed.length > 0) setPrefillIngredients(parsed);
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
        const res = await fetchApi('/products', {
          method: 'POST',
          body: JSON.stringify({ sku, name: ing.name.trim(), quantity, unit }),
        });
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

  const [step, setStep] = useState<Step>('IDLE');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [parsedInfo, setParsedInfo] = useState<ParsedFileInfo | null>(null);
  const [transformResult, setTransformResult] = useState<CsvTransformResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResultBackend | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelected = useCallback(async (selectedFile: File, content: string) => {
    setError('');
    setFile(selectedFile);
    setFileContent(content);
    const info = parseCsvForPreview(content);
    if (!info) {
      setError('Impossible de lire le fichier. Vérifiez qu\'il s\'agit d\'un CSV valide.');
      return;
    }
    setParsedInfo({ ...info, fileName: selectedFile.name, fileSize: selectedFile.size });
    setStep('TRANSFORMING');
    setLoading(true);
    try {
      const result = await transformCsvWithAI(content);
      if (result.success) {
        setTransformResult(result.data);
        setStep('REVIEW');
      } else {
        setError(result.error);
        setStep('ERROR');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'analyse IA.');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  }, []);

  const mappingToApiFormat = useCallback((result: CsvTransformResult): Record<string, string> => {
    const out: Record<string, string> = {};
    result.mapping.forEach((m) => {
      if (m.target) out[m.source] = m.target;
    });
    return out;
  }, []);

  const canImport = transformResult
    ? transformResult.missingRequiredColumns.length === 0
    : false;

  const handleValidateAndImport = useCallback(async () => {
    if (!file || !transformResult || !canImport) return;
    setError('');
    setStep('IMPORTING');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('mapping', JSON.stringify(mappingToApiFormat(transformResult)));
      const res = await fetchApi('/products/import', { method: 'POST', body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Import échoué');
      }
      if (json?.success && json?.data) {
        setImportResult(json.data as ImportResultBackend);
        setStep('SUCCESS');
        toast.success(`${json.data.imported} produit(s) importé(s).`);
      } else {
        throw new Error('Réponse invalide');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'import.');
      setStep('ERROR');
      toast.error(e instanceof Error ? e.message : 'Import échoué');
    } finally {
      setLoading(false);
    }
  }, [file, transformResult, canImport, mappingToApiFormat, fetchApi]);

  const resetToIdle = useCallback(() => {
    setStep('IDLE');
    setFile(null);
    setFileContent('');
    setParsedInfo(null);
    setTransformResult(null);
    setImportResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <PageHeader
          title="Import des stocks"
          actions={
            <div className="flex gap-3">
              {fromOnboarding && (
                <Link href="/onboarding" className="text-sm font-medium text-green-deep hover:underline">
                  ← Retour à l&apos;onboarding
                </Link>
              )}
              <Link href="/stocks" className="text-sm font-medium text-green-deep hover:underline">
                ← Retour aux stocks
              </Link>
            </div>
          }
        />

        <p className="mb-6 text-sm text-charcoal/70">
          <span className="inline-block rounded bg-green-deep/10 px-2 py-0.5 text-xs font-semibold text-green-deep mb-2">Import intelligent avec IA</span>
          <br />
          Importez n&apos;importe quel CSV (export caisse, fournisseur, Excel…). L&apos;IA mappe automatiquement les colonnes puis vous validez l&apos;import.
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-terracotta/30 bg-terracotta/10 px-4 py-2 text-sm text-terracotta" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {fromOnboarding && prefillIngredients.length > 0 && (
          <div className="mb-6 rounded-xl border border-charcoal/8 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-charcoal">Ingrédients détectés depuis l&apos;onboarding</h2>
            <p className="mt-1 text-sm text-charcoal/50">Créez des produits à partir des ingrédients détectés.</p>
            <ul className="mt-3 space-y-2">
              {prefillIngredients.map((ing, idx) => (
                <li key={idx} className="flex justify-between rounded-lg border border-charcoal/8 bg-white px-4 py-2 text-sm">
                  <span className="font-medium text-charcoal">{ing.name}</span>
                  <span className="text-charcoal/50">{ing.qty ?? '—'}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={createFromPrefill}
              disabled={prefillCreating}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-deep px-4 py-2 font-display text-sm font-bold text-cream hover:bg-forest-green disabled:opacity-70"
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

        {/* IDLE */}
        {step === 'IDLE' && (
          <div className="rounded-xl border border-charcoal/8 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-charcoal">Choisir un fichier</h2>
            <p className="mt-1 text-sm text-charcoal/50">
              Glissez votre CSV (export caisse, fournisseur, Excel…) — max {MAX_FILE_SIZE_MB} Mo. L&apos;IA mappe automatiquement les colonnes puis vous validez l&apos;import.
            </p>
            <div className="mt-4">
              <FileUploadZone onFileSelected={handleFileSelected} accept={['.csv', '.txt']} maxSizeMb={MAX_FILE_SIZE_MB} readAs="text" />
            </div>
          </div>
        )}

        {/* TRANSFORMING — skeleton préfigurant le résultat */}
        {step === 'TRANSFORMING' && (
          <div className="space-y-6 rounded-xl border border-charcoal/8 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-charcoal">Mapping en cours</h2>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="skeleton-pulse flex items-center gap-2"
                  style={{
                    background: 'var(--color-background-secondary)',
                    borderRadius: 6,
                    height: 32,
                    animationDelay: `${(i - 1) * 0.1}s`,
                  }}
                >
                  <div style={{ width: 72, height: 18, borderRadius: 6, background: 'var(--color-background-secondary)', filter: 'brightness(0.95)' }} />
                  <span className="text-charcoal/30">→</span>
                  <div style={{ width: 88, height: 18, borderRadius: 6, background: 'var(--color-background-secondary)', filter: 'brightness(0.95)' }} />
                  <div style={{ width: 48, height: 18, borderRadius: 6, background: 'var(--color-background-secondary)', filter: 'brightness(0.95)' }} />
                </div>
              ))}
            </div>

            <h3 className="font-display text-sm font-semibold text-charcoal mt-6">Aperçu des données</h3>
            <div className="overflow-hidden border border-charcoal/10" style={{ borderRadius: 6 }}>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-charcoal/10">
                    {[1, 2, 3, 4, 5].map((c) => (
                      <th key={c} className="px-2 py-2">
                        <div
                          className="skeleton-pulse h-4 rounded"
                          style={{
                            background: 'var(--color-background-secondary)',
                            width: c === 1 ? 48 : c === 2 ? 64 : 56,
                            animationDelay: `${c * 0.1}s`,
                          }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <tr key={r} className="border-b border-charcoal/5 last:border-0">
                      {[1, 2, 3, 4, 5].map((c) => (
                        <td key={c} className="px-2 py-1.5">
                          <div
                            className="skeleton-pulse h-3 rounded"
                            style={{
                              background: 'var(--color-background-secondary)',
                              width: c === 1 ? 40 : c === 2 ? 72 : 44,
                              animationDelay: `${(r * 5 + c) * 0.05}s`,
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 pt-2">
              <div
                className="skeleton-pulse h-3 rounded"
                style={{
                  background: 'var(--color-background-secondary)',
                  width: '85%',
                  borderRadius: 6,
                  animationDelay: '0.3s',
                }}
              />
              <div
                className="skeleton-pulse h-3 rounded"
                style={{
                  background: 'var(--color-background-secondary)',
                  width: '60%',
                  borderRadius: 6,
                  animationDelay: '0.4s',
                }}
              />
            </div>
          </div>
        )}

        {/* REVIEW */}
        {step === 'REVIEW' && transformResult && (
          <div className="space-y-6">
            <div className="rounded-xl border border-charcoal/8 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-semibold text-charcoal">Mapping détecté</h2>

              {transformResult.missingRequiredColumns.length > 0 && (
                <div className="mt-4 rounded-lg border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta" role="alert">
                  <strong>Colonnes obligatoires manquantes :</strong> {transformResult.missingRequiredColumns.join(', ')}. Associez au moins une colonne à SKU et une à Nom pour importer.
                </div>
              )}

              {transformResult.unmappedSourceColumns.length > 0 && (
                <div className="mt-3 rounded-lg border border-gold/30 bg-gold/10 px-4 py-2 text-sm text-charcoal/80">
                  Colonnes ignorées (non mappées) : {transformResult.unmappedSourceColumns.join(', ')}
                </div>
              )}

              <ul className="mt-4 space-y-2">
                {transformResult.mapping.map((m, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="min-w-[140px] truncate text-sm font-medium text-charcoal">{m.source}</span>
                    <span className="text-charcoal/50">→</span>
                    <span className="text-sm text-charcoal/80">{m.target}</span>
                    <span className={`rounded border px-2 py-0.5 text-xs font-medium ${confidenceBadgeClass(m.confidence)}`}>
                      {m.confidence === 'high' ? 'Élevée' : m.confidence === 'medium' ? 'Moyenne' : 'Faible'}
                    </span>
                  </li>
                ))}
              </ul>

              {transformResult.note && (
                <p className="mt-4 rounded-lg border border-charcoal/10 bg-cream/50 px-3 py-2 text-sm text-charcoal/80 italic">
                  {transformResult.note}
                </p>
              )}

              {transformResult.rows.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-display text-sm font-semibold text-charcoal">Aperçu du CSV transformé (10 premières lignes)</h3>
                  <div className="mt-2 overflow-x-auto rounded-lg border border-charcoal/8">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="bg-cream/50">
                          {['sku', 'name', 'quantity', 'unit', 'purchase_price', 'selling_price'].map((c) => (
                            <th key={c} className="whitespace-nowrap border-b border-charcoal/8 px-2 py-1.5 font-medium">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {transformResult.rows.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-b border-charcoal/5">
                            {['sku', 'name', 'quantity', 'unit', 'purchase_price', 'selling_price'].map((col) => (
                              <td key={col} className="max-w-[100px] truncate border-r border-charcoal/5 px-2 py-1">
                                {row[col] ?? '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleValidateAndImport}
                  disabled={!canImport || loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-deep px-4 py-2 font-display text-sm font-bold text-cream hover:bg-forest-green disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  Valider et importer
                </button>
                <button
                  type="button"
                  onClick={resetToIdle}
                  className="rounded-lg border border-charcoal/15 px-4 py-2 font-display text-sm font-semibold text-charcoal hover:bg-cream/50 transition-colors"
                >
                  Recommencer
                </button>
              </div>
            </div>

          </div>
        )}

        {/* IMPORTING */}
        {step === 'IMPORTING' && (
          <div className="rounded-xl border border-charcoal/8 bg-white p-12 shadow-sm text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-green-deep" />
            <p className="mt-4 font-display text-lg font-semibold text-charcoal">Import en cours…</p>
          </div>
        )}

        {/* SUCCESS */}
        {step === 'SUCCESS' && importResult && (
          <div className="rounded-xl border border-charcoal/8 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-charcoal flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-bright" />
              Import terminé
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-green-bright/30 bg-green-light/20 p-4">
                <p className="text-2xl font-bold text-green-deep">{importResult.imported}</p>
                <p className="text-sm text-charcoal/50">Importés</p>
              </div>
              <div className="rounded-lg border border-charcoal/8 bg-cream/30 p-4">
                <p className="text-2xl font-bold text-charcoal">{importResult.totalRows}</p>
                <p className="text-sm text-charcoal/50">Lignes totales</p>
              </div>
              <div className="rounded-lg border border-charcoal/8 bg-cream/30 p-4">
                <p className="text-2xl font-bold text-charcoal">{importResult.ignored}</p>
                <p className="text-sm text-charcoal/50">Ignorées</p>
              </div>
              <div className="rounded-lg border border-gold/30 bg-gold/10 p-4">
                <p className="text-2xl font-bold text-charcoal">{importResult.errors.length}</p>
                <p className="text-sm text-charcoal/50">Erreurs</p>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <ul className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-charcoal/8 text-sm">
                {importResult.errors.slice(0, 15).map((err, i) => (
                  <li key={i} className="border-b border-charcoal/5 px-3 py-2 last:border-0">
                    Ligne {err.row} : {err.message}
                  </li>
                ))}
                {importResult.errors.length > 15 && (
                  <li className="px-3 py-2 text-charcoal/50">… et {importResult.errors.length - 15} autres</li>
                )}
              </ul>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetToIdle}
                className="rounded-lg bg-green-deep px-4 py-2 font-display text-sm font-bold text-cream hover:bg-forest-green"
              >
                Nouvel import
              </button>
              <Link
                href="/stocks"
                className="rounded-lg border border-charcoal/15 px-4 py-2 font-display text-sm font-semibold text-charcoal hover:bg-cream/50"
              >
                Voir les stocks
              </Link>
            </div>
          </div>
        )}

        {/* ERROR */}
        {step === 'ERROR' && (
          <div className="rounded-xl border border-charcoal/8 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-charcoal">Erreur</h2>
            <p className="mt-2 text-sm text-charcoal/80">{error}</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={resetToIdle}
                className="rounded-lg bg-green-deep px-4 py-2 font-display text-sm font-bold text-cream hover:bg-forest-green"
              >
                Recommencer
              </button>
              <Link href="/stocks" className="rounded-lg border border-charcoal/15 px-4 py-2 font-display text-sm font-semibold text-charcoal hover:bg-cream/50">
                Retour aux stocks
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
