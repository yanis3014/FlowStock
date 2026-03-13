'use client';

import type { ComponentType } from 'react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';

const ESTIMATE_BASIC_MESSAGE =
  'Estimation basique à partir des ventes des 30 derniers jours. La précision s\'améliorera avec les prédictions IA (niveau Premium).';

// Cast Recharts components for React 18 / Recharts typings compatibility (class components)
const Rc = {
  LineChart: LineChart as unknown as ComponentType<any>,
  Line: Line as unknown as ComponentType<any>,
  XAxis: XAxis as unknown as ComponentType<any>,
  YAxis: YAxis as unknown as ComponentType<any>,
  CartesianGrid: CartesianGrid as unknown as ComponentType<any>,
  Tooltip: Tooltip as unknown as ComponentType<any>,
  Legend: Legend as unknown as ComponentType<any>,
  ResponsiveContainer: ResponsiveContainer as unknown as ComponentType<any>,
  ReferenceLine: ReferenceLine as unknown as ComponentType<any>,
};

interface StockEstimate {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  unit: string;
  avg_daily_consumption: number | null;
  days_remaining: number | null;
  estimated_stockout_date: string | null;
  confidence_level: 'high' | 'medium' | 'low' | 'insufficient';
  sales_days_count: number;
  period_days: number;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: '#2D6A4F',
  medium: '#D4A843',
  low: '#C1440E',
  insufficient: '#C1440E',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'Fiable',
  medium: 'Moyen',
  low: 'Peu fiable',
  insufficient: 'Pas assez de données',
};

function confidenceLabel(level: string): string {
  return CONFIDENCE_LABELS[level] ?? level;
}

export default function ForecastPage() {
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const [estimates, setEstimates] = useState<StockEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodDays, setPeriodDays] = useState(30);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    fetchApi(`/stock-estimates?period_days=${periodDays}`)
      .then((r) => {
        if (!r.ok) throw new Error('Erreur chargement');
        return r.json();
      })
      .then((json) => {
        if (json?.success && json?.data) {
          setEstimates(json.data);
          setSelectedIds(new Set(json.data.slice(0, 3).map((e: StockEstimate) => e.product_id)));
        } else setError('Données invalides.');
      })
      .catch(() => setError('Erreur réseau.'))
      .finally(() => setLoading(false));
  }, [token, fetchApi, periodDays]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = estimates.filter((e) => selectedIds.has(e.product_id) && e.estimated_stockout_date);
    if (selected.length === 0) return [];

    const dates = new Set<string>();
    dates.add(today.toISOString().split('T')[0]);
    selected.forEach((e) => {
      if (e.estimated_stockout_date) dates.add(e.estimated_stockout_date);
    });
    const sortedDates = Array.from(dates).sort();

    return sortedDates.map((dateStr) => {
      const point: Record<string, string | number> = { date: dateStr };
      const d = new Date(dateStr).getTime();
      const todayTime = today.getTime();

      selected.forEach((e) => {
        const stockout = e.estimated_stockout_date ? new Date(e.estimated_stockout_date).getTime() : null;
        if (stockout == null) {
          point[e.product_id] = e.current_stock;
          return;
        }
        if (d < todayTime) {
          point[e.product_id] = e.current_stock;
          return;
        }
        if (d > stockout) {
          point[e.product_id] = 0;
          return;
        }
        const totalDays = (stockout - todayTime) / (24 * 60 * 60 * 1000);
        const elapsed = (d - todayTime) / (24 * 60 * 60 * 1000);
        const value = Math.max(0, e.current_stock * (1 - elapsed / totalDays));
        point[e.product_id] = Math.round(value * 10) / 10;
      });
      return point;
    });
  }, [estimates, selectedIds]);

  const toggleProduct = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="min-h-full space-y-6 bg-cream font-body" role="region" aria-label="Prévisions de rupture" aria-live="polite">
      <PageHeader
        title="Prévisions de rupture"
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="period-days" className="text-sm text-charcoal/60">Période (jours) :</label>
            <select
              id="period-days"
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className="rounded-xl border border-charcoal/15 bg-white px-3 py-1.5 text-sm text-charcoal focus:outline-none focus:border-green-deep focus:ring-1 focus:ring-green-deep/20 transition-colors"
            >
              <option value={7}>7</option>
              <option value={30}>30</option>
              <option value={90}>90</option>
              <option value={365}>365</option>
            </select>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg border border-terracotta/20 bg-terracotta/10 p-3 text-sm text-terracotta">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      ) : (
        <>
          <p className="flex items-start gap-2 text-xs text-charcoal/60" role="note" aria-label={ESTIMATE_BASIC_MESSAGE}>
            <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            <span>{ESTIMATE_BASIC_MESSAGE}</span>
          </p>
          <div className="rounded-xl border border-charcoal/8 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm text-charcoal/60">Sélectionnez les produits à comparer (courbe de stock jusqu’à la date de rupture estimée) :</p>
            <div className="flex flex-wrap gap-2">
              {estimates.map((e) => (
                <label key={e.product_id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-charcoal/8 px-3 py-2 hover:bg-cream/50">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(e.product_id)}
                    onChange={() => toggleProduct(e.product_id)}
                    className="h-4 w-4 rounded border-charcoal/15 text-green-deep focus:ring-green-deep"
                  />
                  <span className="text-sm font-medium text-charcoal">{e.product_name}</span>
                  <span
                    className="rounded px-1.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${CONFIDENCE_COLORS[e.confidence_level] ?? '#6b7280'}20`,
                      color: CONFIDENCE_COLORS[e.confidence_level] ?? '#6b7280',
                    }}
                    title={e.confidence_level}
                  >
                    {confidenceLabel(e.confidence_level)}
                  </span>
                  {e.estimated_stockout_date && (
                    <span className="text-xs text-charcoal/60">
                      Rupture ~{new Date(e.estimated_stockout_date).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-charcoal/8 bg-white p-4 shadow-sm">
            <h3 className="mb-4 font-display text-sm font-bold text-charcoal">Évolution du stock (tendance)</h3>
            <div className="h-80 w-full" role="img" aria-label="Courbes de prévision de stock par produit">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-charcoal/60">
                  Sélectionnez au moins un produit avec date de rupture estimée.
                </div>
              ) : (
              <Rc.ResponsiveContainer width="100%" height="100%">
                <Rc.LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                  <Rc.CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" />
                  <Rc.XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    stroke="#6B7B76"
                    tickFormatter={(v: string) => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  />
                  <Rc.YAxis tick={{ fontSize: 12 }} stroke="#6B7B76" label={{ value: 'Stock', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                  <Rc.Tooltip
                    formatter={(value: number) => [value, 'Stock']}
                    labelFormatter={(label: string) => `Date: ${new Date(label).toLocaleDateString('fr-FR')}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #F0EBE1' }}
                  />
                  <Rc.Legend />
                  {chartData.length > 0 && (
                    <Rc.ReferenceLine x={new Date().toISOString().split('T')[0]} stroke="#6B7B76" strokeDasharray="4 4" />
                  )}
                  {estimates
                    .filter((e) => selectedIds.has(e.product_id))
                    .map((e) => (
                      <Rc.Line
                        key={e.product_id}
                        type="monotone"
                        dataKey={e.product_id}
                        name={e.product_name}
                        stroke={CONFIDENCE_COLORS[e.confidence_level] ?? '#1A3C34'}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                </Rc.LineChart>
              </Rc.ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-charcoal/8 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-display text-sm font-bold text-charcoal">Détail par produit</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-charcoal/8 text-left text-charcoal/60">
                    <th className="pb-2 pr-4 font-medium">Produit</th>
                    <th className="pb-2 pr-4 font-medium">Stock actuel</th>
                    <th className="pb-2 pr-4 font-medium">Jours restants</th>
                    <th className="pb-2 pr-4 font-medium">Date rupture estimée</th>
                    <th className="pb-2 font-medium">Confiance</th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((e) => (
                    <tr key={e.product_id} className="border-b border-charcoal/5">
                      <td className="py-2 pr-4 font-medium text-charcoal">{e.product_name}</td>
                      <td className="py-2 pr-4">{e.current_stock} {e.unit}</td>
                      <td className="py-2 pr-4">{e.days_remaining != null ? e.days_remaining : '—'}</td>
                      <td className="py-2 pr-4">{e.estimated_stockout_date ? new Date(e.estimated_stockout_date).toLocaleDateString('fr-FR') : '—'}</td>
                      <td className="py-2">
                        <span
                          className="rounded px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: `${CONFIDENCE_COLORS[e.confidence_level] ?? '#6B7B76'}20`,
                            color: CONFIDENCE_COLORS[e.confidence_level] ?? '#6B7B76',
                          }}
                          title={e.confidence_level}
                        >
                          {confidenceLabel(e.confidence_level)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
