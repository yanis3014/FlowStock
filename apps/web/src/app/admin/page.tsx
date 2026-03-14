'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  TrendingUp,
  CreditCard,
  Activity,
  ArrowUpRight,
  TrendingDown,
  Package,
  Wifi,
} from 'lucide-react';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';

interface AdminStats {
  totalUsers: number;
  totalRestaurants: number;
  recentSignups: number;
  monthlyRevenue: number;
  subscriptions: {
    normal: number;
    premium: number;
    premium_plus: number;
  };
  churnRate30d: number;
  avgProductsPerTenant: number;
  activeTenantsLast7d: number;
}

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  href,
  color = 'green',
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  href?: string;
  color?: 'green' | 'gold' | 'terracotta' | 'charcoal';
}) {
  const colorMap = {
    green: 'text-green-deep bg-green-deep/10',
    gold: 'text-gold bg-gold/10',
    terracotta: 'text-terracotta bg-terracotta/10',
    charcoal: 'text-charcoal bg-charcoal/8',
  };

  const card = (
    <div className="group rounded-xl border border-charcoal/8 bg-white p-5 transition-colors hover:border-charcoal/15">
      <div className="mb-3 flex items-start justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[color]}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        {href && (
          <ArrowUpRight className="h-4 w-4 text-charcoal/20 transition-colors group-hover:text-charcoal/50" />
        )}
      </div>
      <p className="font-display text-2xl font-bold text-charcoal">{value}</p>
      <p className="mt-0.5 text-sm text-charcoal/50">{title}</p>
      {sub && <p className="mt-1 text-xs text-charcoal/30">{sub}</p>}
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

export default function AdminDashboardPage() {
  const { fetchApi } = useApi();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchApi('/api/admin/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((payload: { success?: boolean; data?: AdminStats } | null) => {
        if (cancelled) return;
        if (payload?.success && payload.data) {
          setStats(payload.data);
          return;
        }
        setError(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchApi]);

  const totalSubs = stats
    ? stats.subscriptions.normal +
      stats.subscriptions.premium +
      stats.subscriptions.premium_plus
    : 0;

  const churnColor =
    (stats?.churnRate30d ?? 0) > 5
      ? 'text-terracotta'
      : (stats?.churnRate30d ?? 0) >= 2
        ? 'text-gold'
        : 'text-green-deep';

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-charcoal">Vue d&apos;ensemble</h1>
        <p className="mt-0.5 text-sm text-charcoal/40">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-charcoal/8 bg-white p-5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-terracotta/20 bg-terracotta/10 p-4 text-sm text-terracotta">
          Impossible de charger les statistiques.
          <button
            onClick={() => window.location.reload()}
            className="ml-2 underline"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              title="Utilisateurs total"
              value={stats?.totalUsers ?? 0}
              sub={`+${stats?.recentSignups ?? 0} ce mois`}
              icon={Users}
              href="/admin/users"
              color="green"
            />
            <KpiCard
              title="Restaurants total"
              value={stats?.totalRestaurants ?? 0}
              icon={TrendingUp}
              href="/admin/restaurants"
              color="terracotta"
            />
            <KpiCard
              title="Abonnements actifs"
              value={totalSubs}
              icon={CreditCard}
              href="/admin/subscriptions"
              color="gold"
            />
            <KpiCard
              title="MRR estimé"
              value={
                new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  maximumFractionDigits: 0,
                }).format(stats?.monthlyRevenue ?? 0)
              }
              icon={Activity}
              color="green"
            />
          </div>

          {/* Nouvelles métriques */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-charcoal/8 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-terracotta/10">
                  <TrendingDown className="h-4 w-4 text-terracotta" />
                </div>
                <span className="text-xs text-charcoal/50">Churn rate 30j</span>
              </div>
              <p className={`font-display text-2xl font-bold ${churnColor}`}>
                {stats?.churnRate30d ?? 0}%
              </p>
              <p className="mt-0.5 text-xs text-charcoal/40">
                {(stats?.churnRate30d ?? 0) > 5
                  ? 'Attention — taux élevé'
                  : (stats?.churnRate30d ?? 0) >= 2
                    ? 'Surveillance recommandée'
                    : 'Bonne rétention'}
              </p>
            </div>

            <div className="rounded-xl border border-charcoal/8 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-charcoal/8">
                  <Package className="h-4 w-4 text-charcoal" />
                </div>
                <span className="text-xs text-charcoal/50">Produits / restaurant</span>
              </div>
              <p className="font-display text-2xl font-bold text-charcoal">
                {stats?.avgProductsPerTenant ?? 0}
              </p>
              <p className="mt-0.5 text-xs text-charcoal/40">Moyenne par tenant actif</p>
            </div>

            <div className="rounded-xl border border-charcoal/8 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-deep/10">
                  <Wifi className="h-4 w-4 text-green-deep" />
                </div>
                <span className="text-xs text-charcoal/50">Tenants actifs 7j</span>
              </div>
              <p className="font-display text-2xl font-bold text-green-deep">
                {stats?.activeTenantsLast7d ?? 0}
              </p>
              <p className="mt-0.5 text-xs text-charcoal/40">Au moins 1 connexion récente</p>
            </div>
          </div>
        </>
      )}

      {!loading && !error && stats && (
        <div className="rounded-xl border border-charcoal/8 bg-white p-5">
          <h2 className="mb-4 font-display text-sm font-bold text-charcoal">
            Répartition des plans
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Starter', key: 'normal', color: 'bg-charcoal/20' },
              { label: 'Growth', key: 'premium', color: 'bg-green-deep' },
              { label: 'Scale', key: 'premium_plus', color: 'bg-gold' },
            ].map(({ label, key, color }) => {
              const count =
                stats.subscriptions[key as keyof typeof stats.subscriptions];
              const pct = totalSubs > 0 ? Math.round((count / totalSubs) * 100) : 0;
              return (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-charcoal/60">{label}</span>
                    <span className="font-medium text-charcoal">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-charcoal/8">
                    <div
                      className={`h-full rounded-full transition-all ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/admin/users"
          className="group rounded-xl border border-charcoal/8 bg-white p-4 transition-colors hover:border-green-deep/40"
        >
          <Users className="mb-2 h-5 w-5 text-charcoal/40 transition-colors group-hover:text-green-deep" />
          <p className="text-sm font-medium text-charcoal">Gérer les utilisateurs</p>
          <p className="mt-0.5 text-xs text-charcoal/30">Voir, modifier, suspendre</p>
        </Link>
        <Link
          href="/admin/subscriptions"
          className="group rounded-xl border border-charcoal/8 bg-white p-4 transition-colors hover:border-gold/40"
        >
          <CreditCard className="mb-2 h-5 w-5 text-charcoal/40 transition-colors group-hover:text-gold" />
          <p className="text-sm font-medium text-charcoal">Abonnements</p>
          <p className="mt-0.5 text-xs text-charcoal/30">Plans, statuts, overrides</p>
        </Link>
        <Link
          href="/admin/restaurants"
          className="group rounded-xl border border-charcoal/8 bg-white p-4 transition-colors hover:border-terracotta/40"
        >
          <TrendingUp className="mb-2 h-5 w-5 text-charcoal/40 transition-colors group-hover:text-terracotta" />
          <p className="text-sm font-medium text-charcoal">Restaurants</p>
          <p className="mt-0.5 text-xs text-charcoal/30">Suivi des comptes clients</p>
        </Link>
        <Link
          href="/admin/churn"
          className="group rounded-xl border border-charcoal/8 bg-white p-4 transition-colors hover:border-terracotta/40"
        >
          <TrendingDown className="mb-2 h-5 w-5 text-charcoal/40 transition-colors group-hover:text-terracotta" />
          <p className="text-sm font-medium text-charcoal">Churn & Rétention</p>
          <p className="mt-0.5 text-xs text-charcoal/30">Tenants à risque, cohortes</p>
        </Link>
      </div>
    </div>
  );
}
