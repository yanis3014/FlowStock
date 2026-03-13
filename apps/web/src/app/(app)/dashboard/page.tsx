'use client';

import type { ComponentType } from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Check,
  Zap,
  ArrowLeftRight,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  BarChart2,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { OnboardingBanner } from '@/components/onboarding/OnboardingBanner';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { PageHeader } from '@/components/ui/PageHeader';
import { LossDeclarationModal } from '@/components/stocks/LossDeclarationModal';
import { AlertBanner, type AlertItem } from '@/components/ui/AlertBanner';
import { Skeleton } from '@/components/ui/Skeleton';

// Recharts cast for React 18 / typings compatibility
const Rc = {
  BarChart: BarChart as unknown as ComponentType<any>,
  Bar: Bar as unknown as ComponentType<any>,
  XAxis: XAxis as unknown as ComponentType<any>,
  YAxis: YAxis as unknown as ComponentType<any>,
  CartesianGrid: CartesianGrid as unknown as ComponentType<any>,
  Tooltip: Tooltip as unknown as ComponentType<any>,
  ResponsiveContainer: ResponsiveContainer as unknown as ComponentType<any>,
};

interface SalesYesterday {
  total_amount?: number;
  transaction_count?: number;
  change_percent?: number | null;
}

interface CurrentStock {
  total_value?: number;
  product_count?: number;
  low_stock_count?: number;
  critical_stock_count?: number;
}

interface DashboardSummary {
  sales_yesterday?: SalesYesterday;
  current_stock?: CurrentStock;
  alerts?: AlertItem[];
  unread_alert_count?: number;
  pending_orders?: number;
  pending_invoices?: number;
}

interface PosSyncStatus {
  is_degraded: boolean;
  last_event_at: string | null;
  degraded_since: string | null;
  failure_count: number;
}

interface RecentMovement {
  id: string;
  product_id: string;
  product_name: string;
  movement_type: string;
  quantity_before: number | null;
  quantity_after: number | null;
  reason: string | null;
  created_at: string;
}

interface DailyConsumption {
  date: string;
  quantity_sold: number;
  total_amount: number | null;
}

const MOVEMENT_LABELS: Record<string, string> = {
  creation: 'Création',
  quantity_update: 'Modif. qté',
  deletion: 'Suppression',
  import: 'Import',
  pos_sale: 'Vente POS',
};

function formatNumber(val: number | undefined): string {
  if (val == null) return '—';
  return new Intl.NumberFormat('fr-FR').format(val);
}

function formatCurrency(val: number | undefined): string {
  if (val == null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function formatDayLabel(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const { fetchApi } = useApi();
  const { completed: onboardingCompleted, loading: onboardingLoading } = useOnboardingStatus();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [posSyncStatus, setPosSyncStatus] = useState<PosSyncStatus | null>(null);
  const [posNotification, setPosNotification] = useState<'degraded' | 'recovered' | null>(null);
  const prevDegradedRef = useRef<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionStates, setActionStates] = useState<Record<string, 'idle' | 'loading' | 'confirmed'>>({});
  const [lossModalOpen, setLossModalOpen] = useState(false);

  // Widget mouvements récents
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(true);

  // Widget météo stock
  const [dailyConsumption, setDailyConsumption] = useState<DailyConsumption[]>([]);
  const [consumptionLoading, setConsumptionLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchApi('/dashboard/summary')
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) { setError('Erreur lors du chargement.'); return; }
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (json?.success && json?.data) setSummary(json.data);
        else setSummary(null);
      })
      .catch(() => { if (!cancelled) { setError(''); setSummary(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [token, fetchApi]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchApi('/dashboard/pos-sync-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json?.success && json?.data) {
          const data = json.data as PosSyncStatus;
          const wasDegraded = prevDegradedRef.current;
          if (wasDegraded !== null && wasDegraded !== data.is_degraded) {
            setPosNotification(data.is_degraded ? 'degraded' : 'recovered');
            setTimeout(() => setPosNotification(null), 5000);
          }
          prevDegradedRef.current = data.is_degraded;
          setPosSyncStatus(data);
        } else {
          prevDegradedRef.current = null;
          setPosSyncStatus(null);
        }
      })
      .catch(() => { if (!cancelled) { prevDegradedRef.current = null; setPosSyncStatus(null); } });
    return () => { cancelled = true; };
  }, [token, fetchApi]);

  // Load recent movements widget
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setMovementsLoading(true);
    fetchApi('/dashboard/recent-movements?limit=5')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json?.success && Array.isArray(json.data)) setRecentMovements(json.data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMovementsLoading(false); });
    return () => { cancelled = true; };
  }, [token, fetchApi]);

  // Load daily consumption widget (météo stock)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setConsumptionLoading(true);
    fetchApi('/dashboard/daily-consumption?days=7')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json?.success && Array.isArray(json.data)) setDailyConsumption(json.data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setConsumptionLoading(false); });
    return () => { cancelled = true; };
  }, [token, fetchApi]);

  const handleCommander = useCallback(async (alertId: string) => {
    setActionStates((s) => ({ ...s, [alertId]: 'loading' }));
    await new Promise((r) => setTimeout(r, 800));
    setActionStates((s) => ({ ...s, [alertId]: 'confirmed' }));
  }, []);

  const handleMarkAlertsRead = useCallback(
    async (alertIds: string[]) => {
      await fetchApi('/dashboard/alerts/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_ids: alertIds }),
      }).catch(() => {});
      // Optimistic local update: remove marked alerts from summary
      setSummary((prev) => {
        if (!prev) return prev;
        const filtered = (prev.alerts ?? []).filter((a) => !alertIds.includes(a.id));
        return { ...prev, alerts: filtered, unread_alert_count: filtered.length };
      });
    },
    [fetchApi]
  );

  if (loading) return <DashboardSkeleton />;

  const sales = summary?.sales_yesterday ?? {};
  const stock = summary?.current_stock ?? {};
  const alerts: AlertItem[] = summary?.alerts ?? [];
  const prenom = user?.email?.split('@')[0] ?? '';

  const consumptionChartData = dailyConsumption.map((d) => ({
    label: formatDayLabel(d.date),
    quantité: d.quantity_sold,
  }));

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-6xl space-y-6 p-6 pb-28 md:pb-6">
        {!onboardingLoading && !onboardingCompleted && <OnboardingBanner />}

        {error && (
          <div className="rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
            {error}
          </div>
        )}

        {/* Story 2.5: Notification POS */}
        {posNotification === 'degraded' && (
          <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm text-charcoal" role="alert">
            Synchro POS interrompue — vous pouvez continuer avec la saisie manuelle des ventes.
          </div>
        )}
        {posNotification === 'recovered' && (
          <div className="rounded-xl border border-green-deep/30 bg-green-deep/8 px-4 py-2 text-sm text-green-deep" role="alert">
            Synchro POS rétablie.
          </div>
        )}

        {/* Story 2.5: Bandeau mode dégradé POS */}
        {posSyncStatus?.is_degraded && (
          <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-charcoal">
            <p className="font-medium text-charcoal">Synchro POS interrompue</p>
            <p className="mt-1 text-charcoal/60">
              La connexion avec votre caisse est temporairement coupée.
            </p>
            <Link href="/sales" className="mt-2 inline-block font-medium text-green-deep underline hover:no-underline">
              Voir les ventes →
            </Link>
          </div>
        )}

        {/* Header + CTA Rush */}
        <PageHeader
          title={`Bonjour${prenom ? ` ${prenom}` : ''} — Service midi dans 2h`}
          subtitle="Votre vue d'ensemble du jour"
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLossModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-terracotta px-5 py-2.5 font-display text-sm font-bold text-white shadow-sm"
              >
                <AlertTriangle className="h-4 w-4" />
                Déclarer une perte
              </button>
              <Link
                href="/rush"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-deep px-5 py-2.5 font-display text-sm font-bold text-cream shadow-sm transition-colors hover:bg-forest-green"
              >
                <Zap className="h-4 w-4" />
                Mode Rush
              </Link>
            </div>
          }
        />

        {/* 4 KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-charcoal/8 bg-white p-4 shadow-sm">
            <p className="font-display text-[10px] font-bold uppercase tracking-wider text-charcoal/50">CA (hier)</p>
            <p className="mt-1 font-display text-xl font-bold text-charcoal">{formatCurrency(sales.total_amount)}</p>
            <p className="mt-0.5 text-xs font-medium text-green-deep">
              {sales.change_percent != null
                ? `${sales.change_percent >= 0 ? '+' : ''}${sales.change_percent.toFixed(1)}% vs sem.`
                : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-charcoal/8 bg-white p-4 shadow-sm">
            <p className="font-display text-[10px] font-bold uppercase tracking-wider text-charcoal/50">Valeur stock</p>
            <p className="mt-1 font-display text-xl font-bold text-charcoal">{formatCurrency(stock.total_value)}</p>
            <p className="mt-0.5 text-xs font-medium text-charcoal/50">{stock.product_count ?? 0} produits</p>
          </div>
          <div className="rounded-xl border border-charcoal/8 bg-white p-4 shadow-sm">
            <p className="font-display text-[10px] font-bold uppercase tracking-wider text-charcoal/50">Stocks à surveiller</p>
            <p className="mt-1 font-display text-xl font-bold text-charcoal">
              {(stock.low_stock_count ?? 0) + (stock.critical_stock_count ?? 0)}
            </p>
            <p className="mt-0.5 text-xs font-medium text-gold">produits en alerte</p>
          </div>
          <div className="rounded-xl border border-charcoal/8 bg-white p-4 shadow-sm">
            <p className="font-display text-[10px] font-bold uppercase tracking-wider text-charcoal/50">Transactions (hier)</p>
            <p className="mt-1 font-display text-xl font-bold text-charcoal">{formatNumber(sales.transaction_count)}</p>
            <p className="mt-0.5 text-xs font-medium text-charcoal/50">ventes</p>
          </div>
        </div>

        {/* Deux colonnes sur desktop : alertes + mouvements récents */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* AlertBanner — Story 4.4 */}
          <AlertBanner
            alerts={alerts}
            onMarkRead={handleMarkAlertsRead}
            maxVisible={5}
          />

          {/* Widget mouvements récents — Story 4.2 */}
          <section className="rounded-xl border border-charcoal/8 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-sm font-bold text-charcoal">
                <ArrowLeftRight className="h-4 w-4 text-green-deep" aria-hidden />
                Derniers mouvements
              </h2>
              <Link
                href="/movements"
                className="text-xs font-medium text-green-deep hover:underline"
                aria-label="Voir tous les mouvements"
              >
                Voir tout →
              </Link>
            </div>
            {movementsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : recentMovements.length === 0 ? (
              <p className="text-sm text-charcoal/50">Aucun mouvement récent.</p>
            ) : (
              <ul className="space-y-2" role="list">
                {recentMovements.map((m) => {
                  const delta =
                    m.quantity_after != null && m.quantity_before != null
                      ? m.quantity_after - m.quantity_before
                      : null;
                  const isPositive = delta != null && delta > 0;
                  const isNegative = delta != null && delta < 0;
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-charcoal/5 bg-cream/30 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-charcoal truncate block">{m.product_name}</span>
                        <span className="text-xs text-charcoal/50">
                          {MOVEMENT_LABELS[m.movement_type] ?? m.movement_type} · {formatDateShort(m.created_at)}
                        </span>
                      </div>
                      {delta != null && (
                        <span
                          className={`flex items-center gap-1 shrink-0 text-xs font-bold ${
                            isPositive ? 'text-green-deep' : isNegative ? 'text-terracotta' : 'text-charcoal/50'
                          }`}
                        >
                          {isPositive ? <TrendingUp className="h-3 w-3" aria-hidden /> : isNegative ? <TrendingDown className="h-3 w-3" aria-hidden /> : null}
                          {isPositive ? '+' : ''}{delta.toFixed(1)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Widget météo stock (consommation 7 derniers jours) — Story 4.2 */}
        <section className="rounded-xl border border-charcoal/8 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-charcoal">
              <BarChart2 className="h-4 w-4 text-green-deep" aria-hidden />
              Consommation (7 derniers jours)
            </h2>
            <Link href="/stats" className="text-xs font-medium text-green-deep hover:underline">
              Statistiques →
            </Link>
          </div>
          {consumptionLoading ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : dailyConsumption.length === 0 ? (
            <p className="text-sm text-charcoal/50">Aucune donnée de consommation disponible.</p>
          ) : (
            <div className="h-40 w-full" role="img" aria-label="Graphique de consommation des 7 derniers jours">
              <Rc.ResponsiveContainer width="100%" height="100%">
                <Rc.BarChart data={consumptionChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <Rc.CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" />
                  <Rc.XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#6B7B76" />
                  <Rc.YAxis tick={{ fontSize: 11 }} stroke="#6B7B76" />
                  <Rc.Tooltip
                    formatter={(value: number) => [value, 'Qté vendue']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #F0EBE1', fontSize: 12 }}
                  />
                  <Rc.Bar dataKey="quantité" fill="#1A3C34" radius={[3, 3, 0, 0]} name="Qté vendue" />
                </Rc.BarChart>
              </Rc.ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Lien vers stocks en alerte */}
        {((stock.low_stock_count ?? 0) + (stock.critical_stock_count ?? 0)) > 0 && (
          <div className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm text-charcoal">
            <span className="font-medium">
              {(stock.low_stock_count ?? 0) + (stock.critical_stock_count ?? 0)} produit(s) en alerte stock.
            </span>{' '}
            <Link href="/stocks?filter=low" className="font-medium text-green-deep underline hover:no-underline">
              Voir les stocks à surveiller →
            </Link>
          </div>
        )}

        {/* Modal déclaration perte */}
        <LossDeclarationModal
          open={lossModalOpen}
          onClose={() => setLossModalOpen(false)}
          onSuccess={() => {}}
          preselectedProduct={null}
        />
      </div>

      {/* Bouton flottant Chat IA (FAB) — Story 4.2 */}
      <Link
        href="/chat"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-green-deep px-4 py-3 font-display text-sm font-bold text-cream shadow-lg transition-all hover:bg-forest-green hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-green-deep/50 md:bottom-8 md:right-8"
        aria-label="Ouvrir le Chat IA"
      >
        <MessageSquare className="h-5 w-5" aria-hidden />
        <span className="hidden sm:inline">Chat IA</span>
      </Link>
    </div>
  );
}
