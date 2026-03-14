'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendingDown, AlertTriangle, RefreshCw } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

interface ChurnStats {
  churnRate30d: number;
  churnRate90d: number;
  mrrAtRisk: number;
  activeSubscriptions: number;
}

interface AtRiskTenant {
  tenant_id: string;
  company_name: string;
  subscription_tier: string | null;
  last_login_at: string | null;
  days_inactive: number | null;
  monthly_value: number;
}

const TIER_LABELS: Record<string, string> = {
  normal: 'Starter',
  premium: 'Growth',
  premium_plus: 'Scale',
};

function ChurnRateBadge({ rate }: { rate: number }) {
  if (rate > 5) return <span className="font-display text-2xl font-bold text-terracotta">{rate}%</span>;
  if (rate >= 2) return <span className="font-display text-2xl font-bold text-gold">{rate}%</span>;
  return <span className="font-display text-2xl font-bold text-green-deep">{rate}%</span>;
}

export default function AdminChurnPage() {
  const { fetchApi } = useApi();
  const [stats, setStats] = useState<ChurnStats | null>(null);
  const [atRisk, setAtRisk] = useState<AtRiskTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [thresholdDays, setThresholdDays] = useState(14);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchApi('/api/admin/churn-stats').then((r) => (r.ok ? r.json() : null)),
      fetchApi(`/api/admin/at-risk-tenants?threshold_days=${thresholdDays}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([churnPayload, riskPayload]) => {
        if (churnPayload?.success && churnPayload.data) setStats(churnPayload.data as ChurnStats);
        if (riskPayload?.success && Array.isArray(riskPayload.data)) setAtRisk(riskPayload.data as AtRiskTenant[]);
      })
      .finally(() => setLoading(false));
  }, [fetchApi, thresholdDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-charcoal">Churn & Rétention</h1>
          <p className="mt-0.5 text-sm text-charcoal/40">
            Analyse de l&apos;attrition et des tenants à risque
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-charcoal/8 bg-white px-3 py-2 text-sm text-charcoal/50 transition-colors hover:bg-cream-dark disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* KPIs Churn */}
      {loading && !stats ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-charcoal/8 bg-white" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-charcoal/8 bg-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-terracotta" />
              <span className="text-xs text-charcoal/40">Churn 30j</span>
            </div>
            <ChurnRateBadge rate={stats.churnRate30d} />
            <p className="mt-1 text-xs text-charcoal/40">annulations sur 30 jours</p>
          </div>

          <div className="rounded-xl border border-charcoal/8 bg-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-charcoal/40" />
              <span className="text-xs text-charcoal/40">Churn 90j</span>
            </div>
            <ChurnRateBadge rate={stats.churnRate90d} />
            <p className="mt-1 text-xs text-charcoal/40">annulations sur 90 jours</p>
          </div>

          <div className="rounded-xl border border-charcoal/8 bg-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-gold" />
              <span className="text-xs text-charcoal/40">MRR à risque</span>
            </div>
            <p className="font-display text-2xl font-bold text-gold">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              }).format(stats.mrrAtRisk)}
            </p>
            <p className="mt-1 text-xs text-charcoal/40">tenants inactifs &gt; 14j</p>
          </div>

          <div className="rounded-xl border border-charcoal/8 bg-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-4 w-4 text-green-deep">
                <svg viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="6" fillOpacity="0.2" />
                  <circle cx="8" cy="8" r="3" />
                </svg>
              </div>
              <span className="text-xs text-charcoal/40">Abonnements actifs</span>
            </div>
            <p className="font-display text-2xl font-bold text-green-deep">
              {stats.activeSubscriptions}
            </p>
            <p className="mt-1 text-xs text-charcoal/40">actifs, trial ou past_due</p>
          </div>
        </div>
      ) : null}

      {/* Tenants à risque */}
      <div className="rounded-xl border border-charcoal/8 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-sm font-bold text-charcoal">
            Tenants à risque ({atRisk.length})
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-charcoal/40">Seuil inactivité :</label>
            <select
              value={thresholdDays}
              onChange={(e) => setThresholdDays(Number(e.target.value))}
              className="rounded-lg border border-charcoal/8 bg-cream px-2 py-1 text-sm text-charcoal focus:outline-none"
            >
              <option value={7}>7 jours</option>
              <option value={14}>14 jours</option>
              <option value={21}>21 jours</option>
              <option value={30}>30 jours</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg border border-charcoal/5 bg-cream" />
            ))}
          </div>
        ) : atRisk.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-green-deep">Aucun tenant à risque !</p>
            <p className="mt-1 text-xs text-charcoal/40">
              Tous les tenants ont été actifs dans les {thresholdDays} derniers jours.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-charcoal/8">
                  <th className="pb-3 pr-4 font-display text-xs font-bold uppercase tracking-wide text-charcoal/40">Restaurant</th>
                  <th className="pb-3 pr-4 font-display text-xs font-bold uppercase tracking-wide text-charcoal/40">Plan</th>
                  <th className="pb-3 pr-4 font-display text-xs font-bold uppercase tracking-wide text-charcoal/40">Dernière connexion</th>
                  <th className="pb-3 pr-4 font-display text-xs font-bold uppercase tracking-wide text-charcoal/40">Jours inactif</th>
                  <th className="pb-3 font-display text-xs font-bold uppercase tracking-wide text-charcoal/40">MRR</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((t) => (
                  <tr key={t.tenant_id} className="border-b border-charcoal/5 transition-colors hover:bg-cream last:border-0">
                    <td className="py-3 pr-4 font-medium text-charcoal">{t.company_name}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-green-deep/10 px-2 py-0.5 text-xs font-medium text-green-deep">
                        {TIER_LABELS[t.subscription_tier ?? ''] ?? t.subscription_tier ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-charcoal/50">
                      {t.last_login_at
                        ? new Date(t.last_login_at).toLocaleDateString('fr-FR')
                        : 'Jamais'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`font-bold ${
                        (t.days_inactive ?? 0) > 21
                          ? 'text-terracotta'
                          : 'text-gold'
                      }`}>
                        {t.days_inactive ?? '—'} j
                      </span>
                    </td>
                    <td className="py-3 font-display font-bold text-charcoal">
                      {t.monthly_value > 0
                        ? new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                            maximumFractionDigits: 0,
                          }).format(t.monthly_value)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
