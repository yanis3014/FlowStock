'use client';

import type { ComponentType } from 'react';
import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Package } from 'lucide-react';

// Cast Recharts components for React 18 / Recharts typings compatibility
const Rc = {
  BarChart: BarChart as unknown as ComponentType<any>,
  Bar: Bar as unknown as ComponentType<any>,
  XAxis: XAxis as unknown as ComponentType<any>,
  YAxis: YAxis as unknown as ComponentType<any>,
  CartesianGrid: CartesianGrid as unknown as ComponentType<any>,
  Tooltip: Tooltip as unknown as ComponentType<any>,
  ResponsiveContainer: ResponsiveContainer as unknown as ComponentType<any>,
};
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { Skeleton } from '@/components/ui/Skeleton';

interface SalesStats {
  today: { quantity_sold: number; total_amount: number | null; count: number };
  yesterday: { quantity_sold: number; total_amount: number | null; count: number };
  this_week: { quantity_sold: number; total_amount: number | null; count: number };
  this_month: { quantity_sold: number; total_amount: number | null; count: number };
}

interface SummaryGroup {
  key: string;
  quantity_sold: number;
  total_amount: number | null;
  count: number;
}

function formatDateKey(key: string): string {
  try {
    const d = new Date(key);
    return isNaN(d.getTime()) ? key : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  } catch {
    return key;
  }
}

export default function StatsPage() {
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const router = useRouter();
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [dailyData, setDailyData] = useState<SummaryGroup[]>([]);
  const [topProducts, setTopProducts] = useState<SummaryGroup[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'7' | '30'>('30');

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (period === '7' ? 7 : 30));
    const dateFrom = from.toISOString().split('T')[0];
    const dateTo = to.toISOString().split('T')[0];

    Promise.all([
      fetchApi('/sales/stats').then((r) => (r.ok ? r.json() : null)),
      fetchApi(`/sales/summary?group_by=day&date_from=${dateFrom}&date_to=${dateTo}`).then((r) => (r.ok ? r.json() : null)),
      fetchApi('/sales/summary?group_by=product').then((r) => (r.ok ? r.json() : null)),
      fetchApi('/products?limit=500').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([statsRes, dayRes, productRes, productsRes]) => {
        if (statsRes?.success && statsRes?.data) setStats(statsRes.data);
        if (dayRes?.success && dayRes?.data?.groups) setDailyData(dayRes.data.groups);
        if (productRes?.success && productRes?.data?.groups) setTopProducts(productRes.data.groups.slice(0, 10));
        const names: Record<string, string> = {};
        if (productsRes?.success && Array.isArray(productsRes?.data))
          productsRes.data.forEach((p: { id: string; name: string }) => { names[p.id] = p.name ?? p.id; });
        setProductNames(names);
        if (!statsRes?.success && !dayRes?.success) setError('Erreur chargement.');
      })
      .catch(() => setError('Erreur réseau.'))
      .finally(() => setLoading(false));
  }, [token, fetchApi, period]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const chartData = dailyData.map((g) => ({
    date: formatDateKey(g.key),
    fullKey: g.key,
    quantité: g.quantity_sold,
    ventes: g.total_amount ?? 0,
  })).reverse();

  return (
    <div className="min-h-full space-y-6 bg-cream font-body" role="region" aria-label="Statistiques" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold text-charcoal">Statistiques</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPeriod('7')}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${period === '7' ? 'bg-green-deep text-cream hover:bg-forest-green' : 'bg-cream-dark text-charcoal hover:bg-cream-dark/80'}`}
          >
            7 jours
          </button>
          <button
            type="button"
            onClick={() => setPeriod('30')}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${period === '30' ? 'bg-green-deep text-cream hover:bg-forest-green' : 'bg-cream-dark text-charcoal hover:bg-cream-dark/80'}`}
          >
            30 jours
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-terracotta/20 bg-terracotta/10 p-3 text-sm text-terracotta">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-cream-dark bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-deep" />
                  <span className="text-sm font-medium text-charcoal/60">Ventes hier</span>
                </div>
                <p className="mt-1 text-xl font-display font-bold text-charcoal">
                  {stats.yesterday.total_amount != null
                    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.yesterday.total_amount)
                    : '—'}
                </p>
                <p className="text-xs text-charcoal/60">{stats.yesterday.count} vente(s)</p>
              </div>
              <div className="rounded-xl border border-cream-dark bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-deep" />
                  <span className="text-sm font-medium text-charcoal/60">Cette semaine</span>
                </div>
                <p className="mt-1 text-xl font-display font-bold text-charcoal">
                  {stats.this_week.total_amount != null
                    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.this_week.total_amount)
                    : '—'}
                </p>
                <p className="text-xs text-charcoal/60">{stats.this_week.count} vente(s)</p>
              </div>
              <div className="rounded-xl border border-cream-dark bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-deep" />
                  <span className="text-sm font-medium text-charcoal/60">Ce mois</span>
                </div>
                <p className="mt-1 text-xl font-display font-bold text-charcoal">
                  {stats.this_month.total_amount != null
                    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.this_month.total_amount)
                    : '—'}
                </p>
                <p className="text-xs text-charcoal/60">{stats.this_month.count} vente(s)</p>
              </div>
              <div className="rounded-xl border border-cream-dark bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-gold" />
                  <span className="text-sm font-medium text-charcoal/60">Aujourd&apos;hui</span>
                </div>
                <p className="mt-1 text-xl font-display font-bold text-charcoal">
                  {stats.today.total_amount != null
                    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.today.total_amount)
                    : '—'}
                </p>
                <p className="text-xs text-charcoal/60">{stats.today.count} vente(s)</p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-cream-dark bg-white p-4 shadow-sm">
            <h3 className="mb-4 font-display text-sm font-bold text-charcoal">Ventes par jour</h3>
            <div className="h-64 w-full" role="img" aria-label="Graphique des ventes par jour">
              <Rc.ResponsiveContainer width="100%" height="100%">
                <Rc.BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <Rc.CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" />
                  <Rc.XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6B7B76" />
                  <Rc.YAxis tick={{ fontSize: 12 }} stroke="#6B7B76" tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
                  <Rc.Tooltip
                    formatter={(value: number) => [value, 'Quantité']}
                    labelFormatter={(label: string) => `Date: ${label}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #F0EBE1' }}
                  />
                  <Rc.Bar dataKey="quantité" fill="#1A3C34" name="Quantité vendue" radius={[4, 4, 0, 0]} />
                </Rc.BarChart>
              </Rc.ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-cream-dark bg-white p-4 shadow-sm">
            <h3 className="mb-4 font-display text-sm font-bold text-charcoal">Top 10 produits (quantité vendue)</h3>
            <div className="h-64 w-full" role="img" aria-label="Top produits par quantité vendue">
              <Rc.ResponsiveContainer width="100%" height="100%">
                <Rc.BarChart
                  data={topProducts.map((g, i) => {
                const n = productNames[g.key] || `Produit ${i + 1}`;
                return { name: n.length > 18 ? n.slice(0, 18) + '…' : n, quantité: g.quantity_sold, id: g.key };
              })}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
                >
                  <Rc.CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" />
                  <Rc.XAxis type="number" tick={{ fontSize: 12 }} stroke="#6B7B76" />
                  <Rc.YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} stroke="#6B7B76" />
                  <Rc.Tooltip formatter={(value: number) => [value, 'Quantité']} contentStyle={{ borderRadius: '8px', border: '1px solid #F0EBE1' }} />
                  <Rc.Bar dataKey="quantité" fill="#2D6A4F" name="Quantité" radius={[0, 4, 4, 0]} />
                </Rc.BarChart>
              </Rc.ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
