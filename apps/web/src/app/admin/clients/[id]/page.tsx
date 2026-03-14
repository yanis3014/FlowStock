'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Store, Users, Package, ShoppingCart, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';

interface RestaurantUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  suspended: boolean;
}

interface RestaurantDetail {
  id: string;
  company_name: string;
  slug: string;
  industry: string | null;
  created_at: string;
  is_active: boolean;
  subscription_tier: string | null;
  subscription_status: string | null;
  users: RestaurantUser[];
  productCount: number;
  salesCount: number;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Jamais';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminClientProfilPage() {
  const params = useParams();
  const { fetchApi } = useApi();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    fetchApi(`/api/admin/restaurants/${id}`)
      .then(async (r) => {
        const payload = (await r.json().catch(() => ({}))) as {
          success?: boolean;
          data?: RestaurantDetail;
        };
        if (!r.ok || !payload.success || !payload.data) {
          throw new Error('not_found');
        }
        if (!cancelled) setRestaurant(payload.data);
      })
      .catch(() => {
        if (!cancelled) toast.error('Client introuvable.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [fetchApi, id]);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-charcoal/8" />
        <div className="h-48 animate-pulse rounded-xl border border-charcoal/8 bg-white" />
        <div className="h-48 animate-pulse rounded-xl border border-charcoal/8 bg-white" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="space-y-4 p-6">
        <Link href="/admin/clients" className="inline-flex items-center gap-1 text-sm text-charcoal/50 hover:text-charcoal">
          <ArrowLeft className="h-4 w-4" />
          Retour aux clients
        </Link>
        <p className="text-charcoal/50">Client non trouvé.</p>
      </div>
    );
  }

  const TIER_MRR: Record<string, number> = { normal: 29, premium: 89, premium_plus: 149 };
  const mrr = TIER_MRR[restaurant.subscription_tier ?? ''] ?? 0;
  const activeUsers = restaurant.users.filter((u) => !u.suspended).length;

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1 text-sm text-charcoal/50 transition-colors hover:text-charcoal"
      >
        <ArrowLeft className="h-4 w-4" />
        Liste des clients
      </Link>

      {/* En-tête */}
      <div className="rounded-xl border border-charcoal/8 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-terracotta/10">
            <Store className="h-5 w-5 text-terracotta" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-charcoal">{restaurant.company_name}</h1>
            <p className="text-sm text-charcoal/40">{restaurant.slug}</p>
            {restaurant.industry && <p className="mt-1 text-xs text-charcoal/40">{restaurant.industry}</p>}
          </div>
          <div className="ml-auto">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              restaurant.is_active
                ? 'bg-green-deep/10 text-green-deep'
                : 'bg-charcoal/8 text-charcoal/50'
            }`}>
              {restaurant.is_active ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, label: 'Utilisateurs actifs', value: activeUsers },
            { icon: Package, label: 'Produits', value: restaurant.productCount },
            { icon: ShoppingCart, label: 'Ventes', value: restaurant.salesCount },
            { icon: Clock, label: 'MRR', value: mrr > 0 ? `${mrr} €/m` : 'Aucun' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg border border-charcoal/8 bg-cream p-4">
              <div className="flex items-center gap-2 text-charcoal/40">
                <Icon className="h-4 w-4" />
                <span className="text-xs">{label}</span>
              </div>
              <p className="mt-2 font-display text-lg font-bold text-charcoal">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Informations abonnement */}
      <div className="rounded-xl border border-charcoal/8 bg-white p-5">
        <h2 className="font-display text-sm font-bold text-charcoal">Abonnement</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
          <div>
            <dt className="text-charcoal/40">Plan</dt>
            <dd className="mt-1 font-medium text-charcoal capitalize">
              {restaurant.subscription_tier ?? 'Aucun'}
            </dd>
          </div>
          <div>
            <dt className="text-charcoal/40">Statut</dt>
            <dd className="mt-1">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                restaurant.subscription_status === 'active'
                  ? 'bg-green-deep/10 text-green-deep'
                  : restaurant.subscription_status === 'trial'
                    ? 'bg-gold/20 text-gold'
                    : 'bg-charcoal/8 text-charcoal/50'
              }`}>
                {restaurant.subscription_status ?? 'n/a'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-charcoal/40">Inscription</dt>
            <dd className="mt-1 font-medium text-charcoal">
              {new Date(restaurant.created_at).toLocaleDateString('fr-FR')}
            </dd>
          </div>
          <div>
            <dt className="text-charcoal/40">MRR estimé</dt>
            <dd className="mt-1 font-display font-bold text-green-deep">
              {mrr > 0
                ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(mrr)
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Utilisateurs du restaurant */}
      <div className="rounded-xl border border-charcoal/8 bg-white p-5">
        <h2 className="font-display text-sm font-bold text-charcoal">
          Utilisateurs ({restaurant.users.length})
        </h2>
        {restaurant.users.length === 0 ? (
          <p className="mt-4 text-sm text-charcoal/40">Aucun utilisateur lié.</p>
        ) : (
          <div className="mt-4 divide-y divide-charcoal/5">
            {restaurant.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-charcoal">{u.name || u.email}</p>
                  <p className="text-xs text-charcoal/40">{u.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-charcoal/60 capitalize">{u.role}</p>
                  <p className="text-xs text-charcoal/40">
                    {u.last_login_at ? formatDate(u.last_login_at) : 'Jamais connecté'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
