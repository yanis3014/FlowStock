'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, Package, AlertTriangle, Loader2, Check, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

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

interface DashboardAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  product?: { id: string; name: string };
  message: string;
  created_at?: string;
}

interface DashboardSummary {
  sales_yesterday?: SalesYesterday;
  current_stock?: CurrentStock;
  alerts?: DashboardAlert[];
  pending_orders?: number;
  pending_invoices?: number;
}

/** Story 2.5: statut synchro POS (mode dégradé) */
interface PosSyncStatus {
  is_degraded: boolean;
  last_event_at: string | null;
  degraded_since: string | null;
  failure_count: number;
}

/** Données mock pour le frontend (plan frontend-only) quand l’API ne renvoie rien. */
const MOCK_KPIS = {
  food_cost_pct: 28.4,
  food_cost_change: -2.1,
  gaspillage_evite: 340,
  ruptures_evitees: 7,
  couverts: 186,
};

const MOCK_ALERTES_URGENTES = [
  { id: '1', name: 'Saumon atlantique', detail: 'DLC demain', level: 'high' as const },
  { id: '2', name: 'Filet de bœuf', detail: 'Stock faible', level: 'medium' as const },
];

const MOCK_SUGGESTION_IA = {
  titre: 'Plat du jour recommandé pour demain',
  plat: 'Tartare de saumon + Risotto canard',
  economie: '~65€',
  raison: 'Votre saumon arrive à DLC demain — un tartare en entrée évite le gaspillage.',
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

export default function DashboardPage() {
  const { token, user, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [posSyncStatus, setPosSyncStatus] = useState<PosSyncStatus | null>(null);
  const [posNotification, setPosNotification] = useState<'degraded' | 'recovered' | null>(null);
  const prevDegradedRef = useRef<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionStates, setActionStates] = useState<Record<string, 'idle' | 'loading' | 'confirmed'>>({});

  useEffect(() => {
    if (!token && !isLoading) {
      router.push('/login?returnUrl=/dashboard');
      return;
    }
  }, [token, isLoading, router]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    fetchApi('/dashboard/summary')
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError('Erreur lors du chargement.');
          return;
        }
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (json?.success && json?.data) {
          setSummary(json.data);
        } else {
          setSummary(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('');
          setSummary(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
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
      .catch(() => {
        if (!cancelled) {
          prevDegradedRef.current = null;
          setPosSyncStatus(null);
        }
      });
    return () => { cancelled = true; };
  }, [token, fetchApi]);

  const handleCommander = useCallback(
    async (alertId: string) => {
      setActionStates((s) => ({ ...s, [alertId]: 'loading' }));
      await new Promise((r) => setTimeout(r, 800));
      setActionStates((s) => ({ ...s, [alertId]: 'confirmed' }));
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!token) {
    return null;
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  const sales = summary?.sales_yesterday ?? {};
  const stock = summary?.current_stock ?? {};
  const alerts = summary?.alerts ?? [];
  const useMock = !summary?.alerts?.length && !summary?.sales_yesterday && !summary?.current_stock;
  const alertesUrgentes = useMock ? MOCK_ALERTES_URGENTES : alerts.map((a) => ({
    id: a.id,
    name: a.product?.name ?? a.message,
    detail: a.message,
    level: (a.severity === 'high' ? 'high' : a.severity === 'medium' ? 'medium' : 'low') as 'high' | 'medium' | 'low',
  }));

  const prenom = user?.email?.split('@')[0] ?? '';

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:pb-6">
        {error && (
          <div className="rounded-xl border border-red-alert/30 bg-red-alert/10 px-4 py-3 text-sm text-red-alert">
            {error}
          </div>
        )}

        {/* Story 2.5: Notification in-app au passage dégradé / rétabli (Tasks 3.3, 3.4) */}
        {posNotification === 'degraded' && (
          <div className="rounded-xl border border-amber-500/50 bg-amber-50 px-4 py-2 text-sm text-amber-900" role="alert">
            Synchro POS interrompue — vous pouvez continuer avec la saisie manuelle des ventes.
          </div>
        )}
        {posNotification === 'recovered' && (
          <div className="rounded-xl border border-green-600/40 bg-green-50 px-4 py-2 text-sm text-green-800" role="alert">
            Synchro POS rétablie.
          </div>
        )}

        {/* Story 2.5: Bandeau mode dégradé POS */}
        {posSyncStatus?.is_degraded && (
          <div className="rounded-xl border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Synchro POS interrompue</p>
            <p className="mt-1 text-amber-800">
              La connexion avec votre caisse est temporairement coupée. Consultez la liste des ventes ; la saisie manuelle des ventes sera disponible prochainement (Story 3.6).
            </p>
            <Link
              href="/sales"
              className="mt-2 inline-block font-medium text-amber-900 underline hover:no-underline"
            >
              Voir les ventes →
            </Link>
          </div>
        )}

        {/* Message d'accueil + CTA Rush */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-green-deep md:text-3xl">
              Bonjour{prenom ? ` ${prenom}` : ''} — Service midi dans 2h
            </h1>
            <p className="mt-1 text-sm text-gray-warm">
              Votre vue d&apos;ensemble du jour
            </p>
          </div>
          <Link
            href="/rush"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-mid px-6 py-3.5 font-display text-sm font-bold tracking-wide text-white shadow-sm transition-opacity hover:opacity-95"
          >
            <Zap className="h-5 w-5" />
            LANCER LE MODE RUSH
          </Link>
        </div>

        {/* 4 KPIs — Warm Tech */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border-l-4 border-green-mid bg-cream-dark/80 p-4">
            <p className="font-display text-[10px] font-bold uppercase tracking-wider text-gray-warm">
              Food cost
            </p>
            <p className="mt-1 font-display text-xl font-extrabold text-green-deep">
              {useMock ? `${MOCK_KPIS.food_cost_pct}%` : `${MOCK_KPIS.food_cost_pct}%`}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-green-mid">
              {useMock ? `↓ ${MOCK_KPIS.food_cost_change}pts ce mois` : (sales.change_percent != null ? `${(sales.change_percent >= 0 ? '+' : '')}${sales.change_percent.toFixed(1)}%` : '—')}
            </p>
          </div>
          <div className="rounded-xl border-l-4 border-terracotta bg-cream-dark/80 p-4">
            <p className="font-display text-[10px] font-bold uppercase tracking-wider text-gray-warm">
              Gaspillage évité
            </p>
            <p className="mt-1 font-display text-xl font-extrabold text-green-deep">
              {useMock ? formatCurrency(MOCK_KPIS.gaspillage_evite) : formatCurrency(stock.total_value)}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-green-mid">↑ cette semaine</p>
          </div>
          <div className="rounded-xl border-l-4 border-gold bg-cream-dark/80 p-4">
            <p className="font-display text-[10px] font-bold uppercase tracking-wider text-gray-warm">
              Ruptures évitées
            </p>
            <p className="mt-1 font-display text-xl font-extrabold text-green-deep">
              {useMock ? MOCK_KPIS.ruptures_evitees : (stock.low_stock_count ?? 0) + (stock.critical_stock_count ?? 0)}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-green-mid">↑ vs sem. préc.</p>
          </div>
          <div className="rounded-xl border-l-4 border-blue-500 bg-cream-dark/80 p-4">
            <p className="font-display text-[10px] font-bold uppercase tracking-wider text-gray-warm">
              Couverts
            </p>
            <p className="mt-1 font-display text-xl font-extrabold text-green-deep">
              {useMock ? MOCK_KPIS.couverts : formatNumber(sales.transaction_count)}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-gray-warm">→ cette semaine</p>
          </div>
        </div>

        {/* Alertes urgentes */}
        <section className="rounded-2xl border border-green-deep/10 bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-green-deep">
            <AlertTriangle className="h-5 w-5 text-orange-warn" />
            Alertes urgentes
          </h2>
          {alertesUrgentes.length > 0 ? (
            <ul className="space-y-2">
              {alertesUrgentes.map((a) => {
                const state = actionStates[a.id] ?? 'idle';
                const levelClass =
                  a.level === 'high'
                    ? 'border-l-red-alert bg-red-alert/5'
                    : a.level === 'medium'
                      ? 'border-l-orange-warn bg-orange-warn/5'
                      : 'border-l-gray-warm bg-cream-dark';
                return (
                  <li
                    key={a.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border-l-4 p-3 text-sm ${levelClass}`}
                  >
                    <span className="font-medium text-charcoal">
                      {a.name} — {a.detail}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCommander(a.id)}
                      disabled={state === 'loading' || state === 'confirmed'}
                      className="shrink-0 rounded-lg bg-green-mid px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-70"
                    >
                      {state === 'loading' && <Loader2 className="inline h-3.5 w-3.5 animate-spin" />}
                      {state === 'confirmed' && <Check className="inline h-3.5 w-3.5" />}
                      {state === 'idle' && 'Commander'}
                      {state === 'loading' && '…'}
                      {state === 'confirmed' && 'Demandé'}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-warm">Aucune alerte urgente.</p>
          )}
        </section>

        {/* Suggestion IA du jour */}
        <section className="rounded-2xl border border-gold/30 bg-green-deep/5 p-5">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-gold">
            ✦ Suggestion IA
          </div>
          <h2 className="font-display text-base font-bold text-green-deep">
            {MOCK_SUGGESTION_IA.titre}
          </h2>
          <p className="mt-2 text-sm text-charcoal/80">
            {MOCK_SUGGESTION_IA.raison}
          </p>
          <p className="mt-1 font-display text-sm font-bold text-green-deep">
            {MOCK_SUGGESTION_IA.plat} — Économie estimée {MOCK_SUGGESTION_IA.economie}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-gold px-4 py-2 font-display text-sm font-bold text-charcoal"
            >
              Valider ce plat du jour →
            </button>
            <button
              type="button"
              className="rounded-lg border border-green-deep/30 bg-transparent px-4 py-2 font-display text-sm font-bold text-green-deep"
            >
              Proposer une autre option
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
