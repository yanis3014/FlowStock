'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';
import {
  Upload,
  FileImage,
  X,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Package,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import type { InvoiceOcrResult, InvoiceLine, ValidateInvoiceResult } from '@bmad/shared';

type Step = 'IDLE' | 'UPLOADING' | 'REVIEWING' | 'VALIDATING' | 'SUCCESS';

type ConfidenceLevel = 'high' | 'medium' | 'low';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function confidenceBadgeClass(level: ConfidenceLevel): string {
  switch (level) {
    case 'high':
      return 'bg-green-bright/15 text-green-deep border border-green-bright/30';
    case 'medium':
      return 'bg-gold/15 text-charcoal border border-gold/30';
    case 'low':
      return 'bg-terracotta/15 text-terracotta border border-terracotta/30';
  }
}

function confidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'high':
      return 'Haute confiance';
    case 'medium':
      return 'Confiance moyenne';
    case 'low':
      return 'Faible confiance';
  }
}

interface EditableLine extends InvoiceLine {
  _key: string;
}

function emptyLine(): EditableLine {
  return {
    _key: `line-${Date.now()}-${Math.random()}`,
    designation: '',
    quantite: 0,
    unite: '',
    prix_unitaire_ht: null,
    montant_ht: null,
    product_id: null,
  };
}

export default function NouvellelivraisonPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { fetchApi } = useApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  const [step, setStep] = useState<Step>('IDLE');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<InvoiceOcrResult | null>(null);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateInvoiceResult | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG ou PDF.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Fichier trop volumineux (max 10 Mo).');
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  }, []);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current -= 1;
    if (dragCountRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCountRef.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const runOcr = useCallback(
    async (file: File) => {
      if (!token) return;
      setStep('UPLOADING');

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetchApi('/invoices/upload', {
          method: 'POST',
          body: formData,
          timeoutMs: 90000,
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || `Erreur ${res.status}`);
        }

        const j = (await res.json()) as { success: boolean; data: InvoiceOcrResult };
        if (!j.success || !j.data) throw new Error('Réponse inattendue du serveur');

        const ocr = j.data;
        setOcrResult(ocr);
        setSupplierName(ocr.fournisseur || '');
        setInvoiceDate(ocr.date_facture || '');
        setLines(
          ocr.lignes.length > 0
            ? ocr.lignes.map((l, i) => ({ ...l, _key: `line-ocr-${i}` }))
            : [emptyLine()]
        );

        if (ocr.confiance === 'low' || ocr.lignes.length === 0) {
          setIsManualMode(true);
          toast.warning(
            ocr.lignes.length === 0
              ? 'OCR : aucune ligne extraite. Saisissez manuellement.'
              : 'Confiance faible — vérifiez ou corrigez les lignes extraites.'
          );
        } else {
          setIsManualMode(false);
        }

        setStep('REVIEWING');
      } catch (err) {
        const message = err instanceof Error ? err.message : `Erreur lors de l'analyse`;
        toast.error(message);
        setStep('IDLE');
      }
    },
    [token, fetchApi]
  );

  const handleAnalyze = useCallback(() => {
    if (!selectedFile) return;
    runOcr(selectedFile);
  }, [selectedFile, runOcr]);

  const handleRetryOcr = useCallback(() => {
    if (!selectedFile) return;
    runOcr(selectedFile);
  }, [selectedFile, runOcr]);

  const updateLine = useCallback((key: string, field: keyof EditableLine, value: string | number | null) => {
    setLines((prev) =>
      prev.map((l) => (l._key === key ? { ...l, [field]: value } : l))
    );
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine()]);
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => {
      const next = prev.filter((l) => l._key !== key);
      return next.length === 0 ? [emptyLine()] : next;
    });
  }, []);

  const handleValidate = useCallback(async () => {
    const invoiceId = ocrResult?.invoice_id;
    if (!invoiceId) {
      toast.error(`Identifiant de facture manquant`);
      return;
    }

    const validLines = lines.filter((l) => l.designation.trim() && l.quantite > 0);
    if (validLines.length === 0) {
      toast.error('Au moins une ligne avec désignation et quantité > 0 est requise.');
      return;
    }

    setStep('VALIDATING');

    try {
      const res = await fetchApi(`/invoices/${invoiceId}/validate`, {
        method: 'POST',
        body: JSON.stringify({
          lines: validLines.map(({ _key: _k, ...line }) => line),
          supplier_name: supplierName || null,
          invoice_date: invoiceDate || null,
        }),
        timeoutMs: 60000,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || `Erreur ${res.status}`);
      }

      const j = (await res.json()) as { success: boolean; data: ValidateInvoiceResult };
      if (!j.success || !j.data) throw new Error('Réponse inattendue du serveur');

      setValidationResult(j.data);
      setStep('SUCCESS');
      toast.success(`${j.data.updated.length} produit(s) mis à jour avec succès !`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la validation';
      toast.error(message);
      setStep('REVIEWING');
    }
  }, [ocrResult, lines, supplierName, invoiceDate, fetchApi]);

  const handleReset = useCallback(() => {
    setStep('IDLE');
    setSelectedFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    setOcrResult(null);
    setLines([]);
    setSupplierName('');
    setInvoiceDate('');
    setIsManualMode(false);
    setValidationResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [filePreview]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-cream font-body">
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
          <PageHeader
            title="Nouvelle livraison"
            subtitle="Uploadez une photo ou un PDF de facture fournisseur pour mettre à jour vos stocks automatiquement."
          />

          {/* Étape IDLE : Upload */}
          {step === 'IDLE' && (
            <div className="mt-6 space-y-6">
              {/* Drop zone */}
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors cursor-pointer min-h-[240px] p-8 ${
                  isDragging
                    ? 'border-green-deep bg-green-deep/5'
                    : selectedFile
                      ? 'border-green-bright bg-green-bright/5 cursor-default'
                      : 'border-cream-dark bg-white hover:border-green-deep/50 hover:bg-cream/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  className="hidden"
                  onChange={handleInputChange}
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    {filePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={filePreview}
                        alt="Aperçu facture"
                        className="max-h-48 max-w-full rounded-lg object-contain border border-cream-dark shadow-sm"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-terracotta/10">
                        <FileImage className="h-8 w-8 text-terracotta" />
                      </div>
                    )}
                    <div className="text-center">
                      <p className="font-medium text-charcoal">{selectedFile.name}</p>
                      <p className="text-sm text-charcoal/60 mt-0.5">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} Mo
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (filePreview) URL.revokeObjectURL(filePreview);
                        setFilePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="flex items-center gap-1.5 text-sm text-charcoal/50 hover:text-terracotta transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Retirer
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-green-deep/10">
                      <Upload className="h-7 w-7 text-green-deep" />
                    </div>
                    <div>
                      <p className="font-medium text-charcoal">
                        Glissez votre facture ici ou{' '}
                        <span className="text-green-deep underline">parcourez</span>
                      </p>
                      <p className="text-sm text-charcoal/50 mt-1">
                        JPG, PNG, PDF — max 10 Mo
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {selectedFile && (
                <button
                  type="button"
                  onClick={handleAnalyze}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-deep px-6 py-3 text-cream font-semibold hover:bg-green-deep/90 transition-colors"
                >
                  <FileImage className="h-5 w-5" />
                  {`Analyser avec l'IA`}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              )}
            </div>
          )}

          {/* Étape UPLOADING : Skeleton */}
          {step === 'UPLOADING' && (
            <div className="mt-6">
              <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-cream-dark bg-white p-12">
                <Loader2 className="h-10 w-10 text-green-deep animate-spin" />
                <div className="text-center">
                  <p className="font-semibold text-charcoal">Analyse en cours…</p>
                  <p className="text-sm text-charcoal/60 mt-1">{`L'IA extrait les lignes produits de votre facture`}</p>
                </div>
                <div className="w-full max-w-sm space-y-2 mt-4">
                  {[72, 56, 88, 64].map((w, i) => (
                    <div key={i} className="h-4 rounded-md bg-cream-dark animate-pulse" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Étape REVIEWING : Tableau éditable */}
          {step === 'REVIEWING' && (
            <div className="mt-6 space-y-4">
              {/* Header résumé */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {ocrResult && (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${confidenceBadgeClass(ocrResult.confiance)}`}>
                      {confidenceLabel(ocrResult.confiance)}
                    </span>
                  )}
                  {isManualMode && !ocrResult?.confiance && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-charcoal/10 text-charcoal border border-charcoal/20">
                      Saisie manuelle
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={handleRetryOcr}
                      className="flex items-center gap-1.5 text-sm text-charcoal/60 hover:text-charcoal border border-cream-dark rounded-lg px-3 py-1.5 transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {`Réessayer l'OCR`}
                    </button>
                  )}
                </div>
              </div>

              {/* Alerte confiance faible */}
              {ocrResult?.confiance === 'low' && (
                <div className="flex items-start gap-3 rounded-lg bg-terracotta/10 border border-terracotta/20 p-4">
                  <AlertTriangle className="h-5 w-5 text-terracotta shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-charcoal">Confiance OCR faible</p>
                    <p className="text-sm text-charcoal/70 mt-0.5">
                      {`La facture est peut-être difficile à lire. Vérifiez et corrigez les lignes ci-dessous, ou retentez l'OCR.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Métadonnées fournisseur / date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-cream-dark bg-white p-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wider mb-1.5">
                    Fournisseur
                  </label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Nom du fournisseur"
                    className="w-full rounded-lg border border-cream-dark px-3 py-2 text-sm text-charcoal focus:border-green-deep focus:outline-none focus:ring-1 focus:ring-green-deep/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wider mb-1.5">
                    Date de facture
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full rounded-lg border border-cream-dark px-3 py-2 text-sm text-charcoal focus:border-green-deep focus:outline-none focus:ring-1 focus:ring-green-deep/30"
                  />
                </div>
              </div>

              {/* Tableau des lignes */}
              <div className="rounded-xl border border-cream-dark bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-cream-dark bg-cream/50">
                        <th className="text-left px-4 py-3 font-semibold text-charcoal/60 text-xs uppercase tracking-wider">Désignation</th>
                        <th className="text-right px-4 py-3 font-semibold text-charcoal/60 text-xs uppercase tracking-wider w-24">Qté</th>
                        <th className="text-left px-4 py-3 font-semibold text-charcoal/60 text-xs uppercase tracking-wider w-24">Unité</th>
                        <th className="text-right px-4 py-3 font-semibold text-charcoal/60 text-xs uppercase tracking-wider w-28">Prix HT</th>
                        <th className="text-right px-4 py-3 font-semibold text-charcoal/60 text-xs uppercase tracking-wider w-28">Montant HT</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => (
                        <tr key={line._key} className="border-b border-cream-dark/50 last:border-0 hover:bg-cream/20 transition-colors">
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={line.designation}
                              onChange={(e) => updateLine(line._key, 'designation', e.target.value)}
                              placeholder="Désignation produit"
                              className="w-full min-w-[160px] bg-transparent text-charcoal placeholder-charcoal/30 focus:outline-none focus:ring-1 focus:ring-green-deep/30 rounded px-1 py-0.5"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={line.quantite || ''}
                              onChange={(e) => updateLine(line._key, 'quantite', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              min="0"
                              step="0.001"
                              className="w-full text-right bg-transparent text-charcoal placeholder-charcoal/30 focus:outline-none focus:ring-1 focus:ring-green-deep/30 rounded px-1 py-0.5"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={line.unite || ''}
                              onChange={(e) => updateLine(line._key, 'unite', e.target.value || null)}
                              placeholder="kg"
                              className="w-full bg-transparent text-charcoal placeholder-charcoal/30 focus:outline-none focus:ring-1 focus:ring-green-deep/30 rounded px-1 py-0.5"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={line.prix_unitaire_ht ?? ''}
                              onChange={(e) =>
                                updateLine(line._key, 'prix_unitaire_ht', e.target.value ? parseFloat(e.target.value) : null)
                              }
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              className="w-full text-right bg-transparent text-charcoal placeholder-charcoal/30 focus:outline-none focus:ring-1 focus:ring-green-deep/30 rounded px-1 py-0.5"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={line.montant_ht ?? ''}
                              onChange={(e) =>
                                updateLine(line._key, 'montant_ht', e.target.value ? parseFloat(e.target.value) : null)
                              }
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              className="w-full text-right bg-transparent text-charcoal placeholder-charcoal/30 focus:outline-none focus:ring-1 focus:ring-green-deep/30 rounded px-1 py-0.5"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => removeLine(line._key)}
                              className="p-1 rounded text-charcoal/30 hover:text-terracotta hover:bg-terracotta/10 transition-colors"
                              aria-label="Supprimer la ligne"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-cream-dark bg-cream/30">
                  <button
                    type="button"
                    onClick={addLine}
                    className="flex items-center gap-1.5 text-sm text-green-deep font-medium hover:text-green-deep/80 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une ligne
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg border border-cream-dark px-5 py-2.5 text-sm font-medium text-charcoal hover:bg-cream/60 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Recommencer
                </button>
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={lines.every((l) => !l.designation.trim() || l.quantite <= 0)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-deep px-6 py-2.5 text-sm font-semibold text-cream hover:bg-green-deep/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  Valider et intégrer en stock
                </button>
              </div>
            </div>
          )}

          {/* Étape VALIDATING */}
          {step === 'VALIDATING' && (
            <div className="mt-6">
              <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-cream-dark bg-white p-12">
                <Loader2 className="h-10 w-10 text-green-deep animate-spin" />
                <div className="text-center">
                  <p className="font-semibold text-charcoal">Intégration en cours…</p>
                  <p className="text-sm text-charcoal/60 mt-1">Correspondance produits et mise à jour des stocks</p>
                </div>
              </div>
            </div>
          )}

          {/* Étape SUCCESS */}
          {step === 'SUCCESS' && validationResult && (
            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-3 rounded-xl border border-green-bright/30 bg-green-bright/10 p-5">
                <CheckCircle className="h-7 w-7 text-green-deep shrink-0" />
                <div>
                  <p className="font-semibold text-charcoal">Livraison intégrée avec succès</p>
                  <p className="text-sm text-charcoal/70 mt-0.5">
                    {validationResult.updated.length} produit(s) mis à jour
                    {validationResult.unmatched.length > 0 &&
                      ` · ${validationResult.unmatched.length} ligne(s) non reconnue(s)`}
                  </p>
                </div>
              </div>

              {/* Produits mis à jour */}
              {validationResult.updated.length > 0 && (
                <div className="rounded-xl border border-cream-dark bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-cream-dark bg-cream/50">
                    <h3 className="text-sm font-semibold text-charcoal">Stocks mis à jour</h3>
                  </div>
                  <ul className="divide-y divide-cream-dark">
                    {validationResult.updated.map((p) => (
                      <li key={p.product_id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-bright/10">
                            <Package className="h-4 w-4 text-green-deep" />
                          </div>
                          <span className="text-sm font-medium text-charcoal">{p.product_name}</span>
                        </div>
                        <span className="text-sm font-semibold text-green-deep">
                          +{p.qty_added % 1 === 0 ? p.qty_added : p.qty_added.toFixed(3)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Lignes non reconnues */}
              {validationResult.unmatched.length > 0 && (
                <div className="rounded-xl border border-orange-warn/30 bg-orange-warn/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-orange-warn/20">
                    <h3 className="text-sm font-semibold text-charcoal flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-warn" />
                      Lignes non reconnues
                    </h3>
                  </div>
                  <ul className="divide-y divide-orange-warn/10">
                    {validationResult.unmatched.map((u, i) => (
                      <li key={i} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-charcoal">{u.designation}</span>
                        <span className="text-sm text-charcoal/60">{u.quantite}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="px-4 py-3 text-xs text-charcoal/60">
                    {`Ces produits n'ont pas été trouvés dans votre catalogue. Créez-les dans Stocks.`}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg border border-cream-dark px-5 py-2.5 text-sm font-medium text-charcoal hover:bg-cream/60 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Nouvelle livraison
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/stocks')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-deep px-6 py-2.5 text-sm font-semibold text-cream hover:bg-green-deep/90 transition-colors"
                >
                  <Package className="h-4 w-4" />
                  Voir les stocks
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
