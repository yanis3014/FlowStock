'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PageHeader } from '@/components/ui/PageHeader';
import { transformCsvWithAI } from '@/app/(app)/import-stocks/actions';
import type { CsvTransformResult } from '@/types/csv-import';

const MAX_FILE_SIZE_MB = 5;

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

export default function OnboardingStocksImportPage() {
  const { fetchApi } = useApi();
  const router = useRouter();

  const [step, setStep] = useState<Step>('IDLE');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [parsedInfo, setParsedInfo] = useState<ParsedFileInfo | null>(null);
  const [transformResult, setTransformResult] = useState<CsvTransformResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResultBackend | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        const importData = json.data as ImportResultBackend;
        setImportResult(importData);
        setStep('SUCCESS');

        // Marquer l'étape stocks comme complétée dans l'onboarding puis rediriger.
        const prev = await fetchApi('/onboarding/progress')
          .then((r) => r.json())
          .then((res) => res?.data?.onboarding_data ?? {});

        await fetchApi('/onboarding/progress', {
          method: 'PATCH',
          body: JSON.stringify({
            onboarding: {
              ...prev,
              stocks_mode: 'csv',
              stocks_count: importData.imported,
              completed_steps: [
                ...(prev.completed_steps ?? []),
                'stocks',
              ].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i),
              current_step: 'fournisseurs',
            },
          }),
        });

        router.push('/onboarding/fournisseurs');
      } else {
        throw new Error('Réponse invalide');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'import.');
      setStep('ERROR');
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
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
      <PageHeader
        title="Importer votre inventaire initial"
        subtitle="Uploadez votre fichier CSV — l&apos;IA mappe les colonnes automatiquement (Étape 3 sur 6 — Stocks)"
        actions={
          <Link
            href="/onboarding/stocks"
            className="text-sm font-medium text-green-deep hover:underline"
          >
            ← Retour
          </Link>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-alert/30 bg-red-alert/10 px-4 py-2 text-sm text-red-alert" role="alert">
          {error}
        </div>
      )}

      {step === 'IDLE' && (
        <div className="rounded-xl border border-charcoal/10 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-charcoal">Choisir un fichier</h2>
          <p className="mt-1 text-sm text-charcoal/50">
            Glissez votre CSV — max {MAX_FILE_SIZE_MB} Mo. L&apos;IA mappe les colonnes puis vous validez.
          </p>
          <div className="mt-4">
            <FileUploadZone
              onFileSelected={handleFileSelected}
              accept={['.csv', '.txt']}
              maxSizeMb={MAX_FILE_SIZE_MB}
              readAs="text"
            />
          </div>
        </div>
      )}

      {step === 'TRANSFORMING' && (
        <div className="space-y-6 rounded-xl border border-charcoal/10 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-charcoal">Analyse du fichier en cours…</h2>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center gap-2 h-8 rounded bg-charcoal/10 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2 pt-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="h-6 rounded bg-charcoal/10 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {step === 'REVIEW' && transformResult && (
        <div className="space-y-6">
          <div className="rounded-xl border border-charcoal/10 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-charcoal">Mapping détecté</h2>

            {transformResult.missingRequiredColumns.length > 0 && (
              <div className="mt-4 rounded-lg border border-red-alert/30 bg-red-alert/10 px-4 py-3 text-sm text-red-alert" role="alert">
                <strong>Colonnes obligatoires manquantes :</strong> {transformResult.missingRequiredColumns.join(', ')}. Associez au moins une colonne à SKU et une à Nom.
              </div>
            )}

            {transformResult.unmappedSourceColumns.length > 0 && (
              <div className="mt-3 rounded-lg border border-charcoal/15 bg-charcoal/5 px-4 py-2 text-sm text-charcoal/70">
                Colonnes ignorées : {transformResult.unmappedSourceColumns.join(', ')}
              </div>
            )}

            <ul className="mt-4 space-y-2">
              {transformResult.mapping.map((m, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="min-w-[120px] truncate text-sm font-medium text-charcoal">{m.source}</span>
                  <span className="text-charcoal/50">→</span>
                  <span className="text-sm text-charcoal/80">{m.target}</span>
                  <span className={`rounded border px-2 py-0.5 text-xs font-medium ${confidenceBadgeClass(m.confidence)}`}>
                    {m.confidence === 'high' ? 'Élevée' : m.confidence === 'medium' ? 'Moyenne' : 'Faible'}
                  </span>
                </li>
              ))}
            </ul>

            {transformResult.rows.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-charcoal">Aperçu (10 premières lignes)</h3>
                <div className="mt-2 overflow-x-auto rounded-lg border border-charcoal/10">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="bg-charcoal/5">
                        {['sku', 'name', 'quantity', 'unit'].map((c) => (
                          <th key={c} className="whitespace-nowrap border-b border-charcoal/10 px-2 py-1.5 font-medium">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transformResult.rows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b border-charcoal/5">
                          {['sku', 'name', 'quantity', 'unit'].map((col) => (
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
                className="rounded-lg bg-[#1C2B2A] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Valider et importer
              </button>
              <button
                type="button"
                onClick={resetToIdle}
                className="rounded-lg border border-charcoal/15 px-4 py-2 text-sm font-semibold text-charcoal hover:bg-charcoal/5"
              >
                Changer de fichier
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'IMPORTING' && (
        <div className="rounded-xl border border-charcoal/10 bg-white p-12 shadow-sm text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-green-deep border-t-transparent" />
          <p className="mt-4 font-semibold text-charcoal">Import en cours…</p>
        </div>
      )}

      {step === 'SUCCESS' && importResult && (
        <div className="rounded-xl border border-charcoal/10 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-charcoal flex items-center gap-2">
            <span className="text-green-bright">✓</span> Import terminé
          </h2>
          <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-4">
            <div className="rounded-lg border border-green-bright/30 bg-green-bright/10 p-4">
              <p className="text-2xl font-bold text-green-deep">{importResult.imported}</p>
              <p className="text-sm text-charcoal/50">Importés</p>
            </div>
            <div className="rounded-lg border border-charcoal/10 bg-charcoal/5 p-4">
              <p className="text-2xl font-bold text-charcoal">{importResult.totalRows}</p>
              <p className="text-sm text-charcoal/50">Lignes</p>
            </div>
            <div className="rounded-lg border border-charcoal/10 bg-charcoal/5 p-4">
              <p className="text-2xl font-bold text-charcoal">{importResult.ignored}</p>
              <p className="text-sm text-charcoal/50">Ignorées</p>
            </div>
            <div className="rounded-lg border border-charcoal/10 bg-charcoal/5 p-4">
              <p className="text-2xl font-bold text-charcoal">{importResult.errors.length}</p>
              <p className="text-sm text-charcoal/50">Erreurs</p>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <ul className="mt-4 max-h-32 overflow-y-auto rounded-lg border border-charcoal/10 text-sm">
              {importResult.errors.slice(0, 10).map((err, i) => (
                <li key={i} className="border-b border-charcoal/5 px-3 py-2 last:border-0">
                  Ligne {err.row} : {err.message}
                </li>
              ))}
              {importResult.errors.length > 10 && (
                <li className="px-3 py-2 text-charcoal/50">… et {importResult.errors.length - 10} autres</li>
              )}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push('/onboarding/fournisseurs')}
              className="rounded-lg border border-charcoal/15 px-4 py-2 font-display text-sm font-semibold text-charcoal hover:bg-cream/50"
            >
              Continuer l&apos;onboarding →
            </button>
            <button
              type="button"
              onClick={resetToIdle}
              className="rounded-lg border border-charcoal/15 px-4 py-2 text-sm font-semibold text-charcoal hover:bg-charcoal/5"
            >
              Nouvel import
            </button>
          </div>
        </div>
      )}

      {step === 'ERROR' && (
        <div className="rounded-xl border border-charcoal/10 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-charcoal">Erreur</h2>
          <p className="mt-2 text-sm text-charcoal/80">{error}</p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={resetToIdle}
              className="rounded-lg bg-[#1C2B2A] px-4 py-2 text-sm font-semibold text-white"
            >
              Recommencer
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={() => router.push('/onboarding/stocks')}
          className="text-sm text-charcoal/60 hover:text-charcoal min-h-[44px] px-2"
        >
          ← Précédent
        </button>
      </div>
    </div>
  );
}
