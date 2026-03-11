'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Store, Users, Package, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';

interface RestaurantUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  name: string;
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

export default function AdminRestaurantDetailPage() {
  const params = useParams();
  const { fetchApi } = useApi();
  const restaurantId = String(params?.id ?? '');
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!restaurantId) return;

    fetchApi(`/api/admin/restaurants/${restaurantId}`)
      .then(async (r) => {
        const payload = (await r.json().catch(() => ({}))) as {
          success?: boolean;
          data?: RestaurantDetail;
        };
        if (!r.ok || !payload.success || !payload.data) {
          throw new Error('restaurant_fetch_failed');
        }
        if (!cancelled) setRestaurant(payload.data);
      })
      .catch(() => {
        if (!cancelled) toast.error('Impossible de charger ce restaurant.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchApi, restaurantId]);

  const activeUsers = useMemo(
    () => (restaurant ? restaurant.users.filter((u) => !u.suspended).length : 0),
    [restaurant]
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-56 animate-pulse rounded-xl border border-cream/5 bg-charcoal" />
      </div>
    );
  }

  if (!restaurant) return null;

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/admin/restaurants"
        className="inline-flex items-center gap-1 text-sm text-cream/60 transition-colors hover:text-cream"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux restaurants
      </Link>

      <div className="rounded-xl border border-cream/5 bg-charcoal p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-terracotta/15">
            <Store className="h-5 w-5 text-terracotta" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-cream">
              {restaurant.company_name}
            </h1>
            <p className="text-sm text-cream/40">{restaurant.slug}</p>
            {restaurant.industry && (
              <p className="mt-1 text-xs text-cream/40">{restaurant.industry}</p>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-cream/5 bg-[#111816] p-4">
            <div className="flex items-center gap-2 text-cream/40">
              <Users className="h-4 w-4" />
              <span className="text-xs">Utilisateurs actifs</span>
            </div>
            <p className="mt-2 font-display text-lg font-bold text-cream">{activeUsers}</p>
          </div>
          <div className="rounded-lg border border-cream/5 bg-[#111816] p-4">
            <div className="flex items-center gap-2 text-cream/40">
              <Package className="h-4 w-4" />
              <span className="text-xs">Produits</span>
            </div>
            <p className="mt-2 font-display text-lg font-bold text-cream">
              {restaurant.productCount}
            </p>
          </div>
          <div className="rounded-lg border border-cream/5 bg-[#111816] p-4">
            <div className="flex items-center gap-2 text-cream/40">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-xs">Ventes</span>
            </div>
            <p className="mt-2 font-display text-lg font-bold text-cream">
              {restaurant.salesCount}
            </p>
          </div>
          <div className="rounded-lg border border-cream/5 bg-[#111816] p-4">
            <p className="text-xs text-cream/40">Abonnement</p>
            <p className="mt-2 text-sm font-medium text-cream">
              {restaurant.subscription_tier ?? 'Aucun'} ({restaurant.subscription_status ?? 'n/a'})
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-cream/5 bg-charcoal p-5">
        <h2 className="font-display text-sm font-bold text-cream">Utilisateurs du restaurant</h2>
        {restaurant.users.length === 0 ? (
          <p className="mt-4 text-sm text-cream/40">Aucun utilisateur lié.</p>
        ) : (
          <div className="mt-4 divide-y divide-cream/5">
            {restaurant.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-cream">{u.name || u.email}</p>
                  <p className="text-xs text-cream/40">{u.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-cream/60">{u.role}</p>
                  <p className="text-xs text-cream/40">
                    {u.last_login_at
                      ? `Dernière connexion: ${new Date(u.last_login_at).toLocaleDateString(
                          'fr-FR'
                        )}`
                      : 'Jamais connecté'}
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
