'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Store, Users, Package, ShoppingCart, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';

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
  const router = useRouter();
  const { fetchApi } = useApi();
  const { setToken, token } = useAuth();
  const restaurantId = String(params?.id ?? '');
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);

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

  const handleImpersonate = async () => {
    if (!restaurant) return;
    setImpersonating(true);
    try {
      const r = await fetchApi(`/api/admin/impersonate/${restaurant.id}`, { method: 'POST' });
      const payload = (await r.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { token: string; tenantName: string };
      };
      if (!r.ok || !payload.success || !payload.data) {
        throw new Error('impersonate_failed');
      }
      // Sauvegarder le token admin courant
      if (token) {
        sessionStorage.setItem('admin_token_backup', token);
        sessionStorage.setItem('impersonated_tenant_name', payload.data.tenantName);
      }
      // Remplacer le token par le token d'impersonnification
      setToken(payload.data.token);
      router.push('/dashboard');
    } catch {
      toast.error("Impossible d'accéder à ce compte.");
    } finally {
      setImpersonating(false);
    }
  };

  const activeUsers = useMemo(
    () => (restaurant ? restaurant.users.filter((u) => !u.suspended).length : 0),
    [restaurant]
  );

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-charcoal/8" />
        <div className="h-56 animate-pulse rounded-xl border border-charcoal/8 bg-white" />
      </div>
    );
  }

  if (!restaurant) return null;

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/admin/restaurants"
        className="inline-flex items-center gap-1 text-sm text-charcoal/50 transition-colors hover:text-charcoal"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux restaurants
      </Link>

      <div className="rounded-xl border border-charcoal/8 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-terracotta/10">
              <Store className="h-5 w-5 text-terracotta" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-charcoal">
                {restaurant.company_name}
              </h1>
              <p className="text-sm text-charcoal/40">{restaurant.slug}</p>
              {restaurant.industry && (
                <p className="mt-1 text-xs text-charcoal/40">{restaurant.industry}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleImpersonate}
            disabled={impersonating}
            className="flex items-center gap-2 rounded-lg border border-terracotta/20 bg-terracotta/5 px-3 py-2 text-sm font-medium text-terracotta transition-colors hover:bg-terracotta/10 disabled:opacity-50"
          >
            {impersonating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Voir en tant que ce restaurant
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-charcoal/8 bg-cream p-4">
            <div className="flex items-center gap-2 text-charcoal/40">
              <Users className="h-4 w-4" />
              <span className="text-xs">Utilisateurs actifs</span>
            </div>
            <p className="mt-2 font-display text-lg font-bold text-charcoal">{activeUsers}</p>
          </div>
          <div className="rounded-lg border border-charcoal/8 bg-cream p-4">
            <div className="flex items-center gap-2 text-charcoal/40">
              <Package className="h-4 w-4" />
              <span className="text-xs">Produits</span>
            </div>
            <p className="mt-2 font-display text-lg font-bold text-charcoal">
              {restaurant.productCount}
            </p>
          </div>
          <div className="rounded-lg border border-charcoal/8 bg-cream p-4">
            <div className="flex items-center gap-2 text-charcoal/40">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-xs">Ventes</span>
            </div>
            <p className="mt-2 font-display text-lg font-bold text-charcoal">
              {restaurant.salesCount}
            </p>
          </div>
          <div className="rounded-lg border border-charcoal/8 bg-cream p-4">
            <p className="text-xs text-charcoal/40">Abonnement</p>
            <p className="mt-2 text-sm font-medium text-charcoal capitalize">
              {restaurant.subscription_tier ?? 'Aucun'}
            </p>
            <p className="text-xs text-charcoal/40">
              {restaurant.subscription_status ?? 'n/a'}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-charcoal/8 bg-white p-5">
        <h2 className="font-display text-sm font-bold text-charcoal">
          Utilisateurs du restaurant
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
                  <p className="text-xs capitalize text-charcoal/60">{u.role}</p>
                  <p className="text-xs text-charcoal/40">
                    {u.last_login_at
                      ? `Dernière connexion : ${new Date(u.last_login_at).toLocaleDateString('fr-FR')}`
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
