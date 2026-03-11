'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  TrendingUp,
  CreditCard,
  Activity,
  ArrowUpRight,
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
  color?: 'green' | 'gold' | 'terracotta';
}) {
  const colorMap = {
    green: 'text-green-deep bg-green-deep/10',
    gold: 'text-gold bg-gold/10',
    terracotta: 'text-terracotta bg-terracotta/10',
  };

  const card = (
    <div className="group rounded-xl border border-cream/5 bg-charcoal p-5 transition-colors hover:border-cream/10">
      <div className="mb-3 flex items-start justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[color]}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        {href && (
          <ArrowUpRight className="h-4 w-4 text-cream/20 transition-colors group-hover:text-cream/50" />
        )}
      </div>
      <p className="font-display text-2xl font-bold text-cream">{value}</p>
      <p className="mt-0.5 text-sm text-cream/50">{title}</p>
      {sub && <p className="mt-1 text-xs text-cream/30">{sub}</p>}
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-cream">Vue d&apos;ensemble</h1>
        <p className="mt-0.5 text-sm text-cream/40">
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
              className="h-28 animate-pulse rounded-xl border border-cream/5 bg-charcoal p-5"
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
      )}

      {!loading && !error && stats && (
        <div className="rounded-xl border border-cream/5 bg-charcoal p-5">
          <h2 className="mb-4 font-display text-sm font-bold text-cream">
            Répartition des plans
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Starter', key: 'normal', color: 'bg-cream/20' },
              { label: 'Growth', key: 'premium', color: 'bg-green-deep' },
              { label: 'Scale', key: 'premium_plus', color: 'bg-gold' },
            ].map(({ label, key, color }) => {
              const count =
                stats.subscriptions[key as keyof typeof stats.subscriptions];
              const pct = totalSubs > 0 ? Math.round((count / totalSubs) * 100) : 0;
              return (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-cream/60">{label}</span>
                    <span className="font-medium text-cream">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-cream/5">
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
          className="group rounded-xl border border-cream/5 bg-charcoal p-4 transition-colors hover:border-green-deep/40"
        >
          <Users className="mb-2 h-5 w-5 text-cream/40 transition-colors group-hover:text-green-deep" />
          <p className="text-sm font-medium text-cream">Gérer les utilisateurs</p>
          <p className="mt-0.5 text-xs text-cream/30">Voir, modifier, suspendre</p>
        </Link>
        <Link
          href="/admin/subscriptions"
          className="group rounded-xl border border-cream/5 bg-charcoal p-4 transition-colors hover:border-gold/40"
        >
          <CreditCard className="mb-2 h-5 w-5 text-cream/40 transition-colors group-hover:text-gold" />
          <p className="text-sm font-medium text-cream">Abonnements</p>
          <p className="mt-0.5 text-xs text-cream/30">Plans, statuts, overrides</p>
        </Link>
        <Link
          href="/admin/restaurants"
          className="group rounded-xl border border-cream/5 bg-charcoal p-4 transition-colors hover:border-terracotta/40"
        >
          <TrendingUp className="mb-2 h-5 w-5 text-cream/40 transition-colors group-hover:text-terracotta" />
          <p className="text-sm font-medium text-cream">Restaurants</p>
          <p className="mt-0.5 text-xs text-cream/30">Suivi des comptes clients</p>
        </Link>
        <Link
          href="/admin/system"
          className="group rounded-xl border border-cream/5 bg-charcoal p-4 transition-colors hover:border-green-deep/40"
        >
          <Activity className="mb-2 h-5 w-5 text-cream/40 transition-colors group-hover:text-green-deep" />
          <p className="text-sm font-medium text-cream">Système</p>
          <p className="mt-0.5 text-xs text-cream/30">Santé API et base</p>
        </Link>
      </div>
    </div>
  );
}
