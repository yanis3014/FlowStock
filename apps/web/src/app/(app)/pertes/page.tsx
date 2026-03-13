'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Download, RefreshCw, Loader2, Brain, TrendingDown, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import type { StockDiscrepancy, DiscrepancyReport } from '@bmad/shared';

const PERIOD_OPTIONS = [
  { value: 7, label: '7 derniers jours' },
  { value: 30, label: '30 derniers jours' },
  { value: 90, label: '90 derniers jours' },
];

const THRESHOLD_OPTIONS = [
  { value: 5, label: '5 %' },
  { value: 10, label: '10 % (défaut)' },
  { value: 20, label: '20 %' },
  { value: 30, label: '30 %' },
];

function ecartBadgeClass(isAnomaly: boolean, ecartPct: number): string {
  if (!isAnomaly) return 'bg-green-bright/15 text-green-bright border-green-bright/30';
  if (ecartPct > 20) return 'bg-red-alert/15 text-red-alert border-red-alert/30';
  return 'bg-orange-warn/15 text-orange-warn border-orange-warn/30';
}

async function exportToPdf(report: DiscrepancyReport): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(28, 43, 42);
  doc.text('Rapport Pertes & Écarts de stock', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Généré le ${new Date(report.generated_at).toLocaleString('fr-FR')} · Période : ${report.period_days} jours · Seuil anomalie : ${report.anomaly_threshold_pct}%`,
    14,
    25
  );

  if (report.ai_summary) {
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(`Analyse IA : ${report.ai_summary}`, 265);
    doc.text(lines, 14, 32);
  }

  const tableY = report.ai_summary ? 44 : 32;

  autoTable(doc, {
    startY: tableY,
    head: [
      ['Produit', 'SKU', 'Unité', 'Stock théorique', 'Stock réel', 'Écart', 'Écart %', 'Entrées', 'Ventes POS', 'Pertes déclarées', 'Analyse IA', 'Anomalie'],
    ],
    body: report.items.map((item) => [
      item.product_name,
      item.product_sku,
      item.unit,
      item.stock_theorique.toFixed(2),
      item.stock_reel.toFixed(2),
      item.ecart.toFixed(2),
      `${item.ecart_pct.toFixed(1)} %`,
      item.total_entries.toFixed(2),
      item.total_pos_sales.toFixed(2),
      item.total_losses.toFixed(2),
      item.ai_analysis ?? '—',
      item.is_anomaly ? 'OUI' : 'Non',
    ]),
    headStyles: {
      fillColor: [28, 43, 42] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 246, 240] as [number, number, number] },
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `FlowStock — Conformité AGEC 2030 · Page ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`flowstock-rapport-ecarts-${dateStr}.pdf`);
}

export default function PertesPage() {
  const { token } = useAuth();
  const { fetchApi } = useApi();

  const [report, setReport] = useState<DiscrepancyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodDays, setPeriodDays] = useState(30);
  const [thresholdPct, setThresholdPct] = useState(10);
  const [aiLoading, setAiLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [filterAnomalyOnly, setFilterAnomalyOnly] = useState(false);

  const loadReport = useCallback(
    (withAI = false) => {
      if (!token) return;
      if (withAI) {
        setAiLoading(true);
      } else {
        setLoading(true);
      }
      setError('');

      const endpoint = withAI ? '/discrepancies/analyze' : '/discrepancies';
      const params = new URLSearchParams({
        period_days: String(periodDays),
        anomaly_threshold_pct: String(thresholdPct),
      });

      fetchApi(`${endpoint}?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : r.json().then((j: { error?: string }) => Promise.reject(new Error(j?.error ?? 'Erreur')))))
        .then((json) => {
          if (json?.success && json?.data) {
            setReport(json.data as DiscrepancyReport);
          }
        })
        .catch((err: Error) => setError(err.message ?? 'Erreur lors du chargement.'))
        .finally(() => {
          setLoading(false);
          setAiLoading(false);
        });
    },
    [token, fetchApi, periodDays, thresholdPct]
  );

  useEffect(() => {
    if (token) loadReport(false);
  }, [token, loadReport]);

  const handleExportPdf = async () => {
    if (!report) return;
    setExportLoading(true);
    try {
      await exportToPdf(report);
    } catch {
      setError('Erreur lors de la génération du PDF.');
    } finally {
      setExportLoading(false);
    }
  };

  const displayedItems: StockDiscrepancy[] = report
    ? filterAnomalyOnly
      ? report.items.filter((i) => i.is_anomaly)
      : report.items
    : [];

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <TrendingDown className="h-7 w-7 text-terracotta" />
            <div>
              <h1 className="font-display text-2xl font-bold text-green-deep">Pertes & Écarts</h1>
              <p className="text-sm text-gray-warm">
                Écarts théorique / réel · Détection anomalies · Conformité AGEC 2030
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadReport(false)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-green-deep/10 px-4 py-2.5 font-display text-sm font-bold text-green-deep disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualiser
            </button>
            <button
              type="button"
              onClick={() => loadReport(true)}
              disabled={aiLoading || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-green-mid px-4 py-2.5 font-display text-sm font-bold text-white disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              Analyser avec IA
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={!report || exportLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-terracotta px-4 py-2.5 font-display text-sm font-bold text-white disabled:opacity-50"
            >
              {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exporter PDF
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-warm">Période</label>
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(parseInt(e.target.value, 10))}
              className="mt-1 rounded-xl border border-green-deep/20 bg-white px-4 py-2.5 text-sm text-charcoal"
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-warm">Seuil anomalie</label>
            <select
              value={thresholdPct}
              onChange={(e) => setThresholdPct(parseFloat(e.target.value))}
              className="mt-1 rounded-xl border border-green-deep/20 bg-white px-4 py-2.5 text-sm text-charcoal"
            >
              {THRESHOLD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 pb-0.5">
              <input
                type="checkbox"
                checked={filterAnomalyOnly}
                onChange={(e) => setFilterAnomalyOnly(e.target.checked)}
                className="h-4 w-4 accent-terracotta"
              />
              <span className="text-sm text-charcoal">Anomalies uniquement</span>
            </label>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="rounded-xl border border-red-alert/30 bg-red-alert/10 px-4 py-3 text-sm text-red-alert">
            {error}
          </div>
        )}

        {/* Synthèse IA */}
        {report?.ai_summary && (
          <div className="flex items-start gap-3 rounded-xl border border-green-mid/30 bg-green-mid/8 px-4 py-3">
            <Brain className="mt-0.5 h-5 w-5 shrink-0 text-green-mid" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-green-mid">Analyse IA (GPT-4o)</p>
              <p className="mt-1 text-sm text-charcoal">{report.ai_summary}</p>
            </div>
          </div>
        )}

        {/* KPIs rapides */}
        {report && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-green-deep/10 bg-white p-4 shadow-sm">
              <p className="font-display text-[10px] font-bold uppercase tracking-wider text-gray-warm">
                Produits analysés
              </p>
              <p className="mt-1 font-display text-xl font-bold text-charcoal">{report.items.length}</p>
            </div>
            <div className="rounded-xl border border-green-deep/10 bg-white p-4 shadow-sm">
              <p className="font-display text-[10px] font-bold uppercase tracking-wider text-gray-warm">
                Anomalies détectées
              </p>
              <p className="mt-1 font-display text-xl font-bold text-terracotta">{report.anomaly_count}</p>
            </div>
            <div className="rounded-xl border border-green-deep/10 bg-white p-4 shadow-sm">
              <p className="font-display text-[10px] font-bold uppercase tracking-wider text-gray-warm">
                Total pertes déclarées
              </p>
              <p className="mt-1 font-display text-xl font-bold text-charcoal">
                {report.items.reduce((sum, i) => sum + i.total_losses, 0).toFixed(1)}
              </p>
            </div>
            <div className="rounded-xl border border-green-deep/10 bg-white p-4 shadow-sm">
              <p className="font-display text-[10px] font-bold uppercase tracking-wider text-gray-warm">
                Période analysée
              </p>
              <p className="mt-1 font-display text-xl font-bold text-charcoal">{report.period_days} j</p>
            </div>
          </div>
        )}

        {/* Tableau */}
        <div className="overflow-x-auto rounded-2xl border border-green-deep/10 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-green-mid" />
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-warm">
              {filterAnomalyOnly
                ? 'Aucune anomalie détectée sur la période.'
                : 'Aucun produit avec des mouvements sur la période.'}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-cream-dark bg-green-deep/5">
                  <th className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    Produit
                  </th>
                  <th className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-right font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    Stock théorique
                  </th>
                  <th className="px-4 py-3 text-right font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    Stock réel
                  </th>
                  <th className="px-4 py-3 text-right font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    Écart
                  </th>
                  <th className="px-4 py-3 text-right font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    Écart %
                  </th>
                  <th className="px-4 py-3 text-right font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    Pertes
                  </th>
                  <th className="px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wider text-gray-warm">
                    Analyse IA
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item) => (
                  <tr
                    key={item.product_id}
                    className={`border-b border-cream-dark last:border-0 hover:bg-cream/50 ${item.is_anomaly ? 'bg-terracotta/3' : ''}`}
                  >
                    <td className="px-4 py-3 font-display font-semibold text-green-deep">
                      {item.product_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal">{item.product_sku}</td>
                    <td className="px-4 py-3 text-right text-sm text-charcoal">
                      {item.stock_theorique.toFixed(2)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-charcoal">
                      {item.stock_reel.toFixed(2)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-charcoal">
                      {item.ecart.toFixed(2)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${ecartBadgeClass(item.is_anomaly, item.ecart_pct)}`}
                      >
                        {item.ecart_pct.toFixed(1)} %
                        {item.is_anomaly && ' ⚠'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-charcoal">
                      {item.total_losses > 0 ? (
                        <span className="font-medium text-terracotta">
                          {item.total_losses.toFixed(2)} {item.unit}
                        </span>
                      ) : (
                        <span className="text-gray-warm">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal">
                      {item.ai_analysis ? (
                        <span className="italic text-green-mid">{item.ai_analysis}</span>
                      ) : item.is_anomaly ? (
                        <span className="text-xs text-gray-warm">
                          Cliquer sur « Analyser avec IA »
                        </span>
                      ) : (
                        <span className="text-gray-warm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Note conformité AGEC */}
        <p className="flex items-start gap-2 text-xs text-gray-warm" role="note">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Ce rapport est conforme aux exigences de traçabilité AGEC 2030. Exportez-le en PDF pour vos
            audits. Seuil d&apos;anomalie : {thresholdPct}% du débit produit sur la période.
          </span>
        </p>
      </div>
    </div>
  );
}
