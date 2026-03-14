'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, UserX, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';

interface AdminUserDetail {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  role: string;
  is_active: boolean;
  suspended: boolean;
  email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  company_name: string;
  slug: string;
  subscription_tier: string | null;
  subscription_status: string | null;
  productCount: number;
  salesCount: number;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchApi } = useApi();
  const userId = String(params?.id ?? '');
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const displayName = useMemo(() => {
    if (!user) return '';
    return user.name || user.email.split('@')[0];
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;

    setLoading(true);
    fetchApi(`/api/admin/users/${userId}`)
      .then(async (r) => {
        const payload = (await r.json().catch(() => ({}))) as {
          success?: boolean;
          data?: AdminUserDetail;
          error?: string;
        };
        if (!r.ok || !payload.success || !payload.data) {
          throw new Error(payload.error ?? 'fetch_failed');
        }
        if (!cancelled) setUser(payload.data);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Impossible de charger ce profil utilisateur.');
          router.push('/admin/users');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchApi, userId, router]);

  const patchUser = async (body: Record<string, unknown>) => {
    if (!user) return;
    setUpdating(true);
    try {
      const res = await fetchApi(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? 'update_failed');
      toast.success('Profil mis à jour.');
      const refreshed = await fetchApi(`/api/admin/users/${user.id}`);
      const refreshedPayload = (await refreshed.json().catch(() => ({}))) as {
        success?: boolean;
        data?: AdminUserDetail;
      };
      if (refreshed.ok && refreshedPayload.success && refreshedPayload.data) {
        setUser(refreshedPayload.data);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur lors de la modification.';
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-40 animate-pulse rounded-xl border border-charcoal/8 bg-white" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-charcoal/50 transition-colors hover:text-charcoal"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux utilisateurs
      </Link>

      <div className="rounded-xl border border-charcoal/8 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-charcoal">{displayName}</h1>
            <p className="text-sm text-charcoal/40">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={updating || user.role === 'admin'}
              onClick={() => patchUser({ role: 'admin' })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              Promouvoir admin
            </button>
            <button
              disabled={updating}
              onClick={() => patchUser({ suspended: !user.suspended })}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                user.suspended
                  ? 'border-green-deep/30 bg-green-deep/10 text-green-deep hover:bg-green-deep/20'
                  : 'border-terracotta/30 bg-terracotta/10 text-terracotta hover:bg-terracotta/20'
              } disabled:opacity-50`}
            >
              {user.suspended ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <UserX className="h-4 w-4" />
              )}
              {user.suspended ? 'Réactiver' : 'Suspendre'}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Rôle', value: user.role },
            { label: 'Statut compte', value: user.suspended ? 'Suspendu' : 'Actif' },
            { label: 'Email vérifié', value: user.email_verified ? 'Oui' : 'Non' },
            {
              label: 'Dernière connexion',
              value: user.last_login_at
                ? new Date(user.last_login_at).toLocaleString('fr-FR')
                : 'Jamais',
            },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-charcoal/8 bg-cream p-4">
              <p className="text-xs text-charcoal/40">{label}</p>
              <p className="mt-1 text-sm font-medium text-charcoal capitalize">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-charcoal/8 bg-white p-5">
          <h2 className="font-display text-sm font-bold text-charcoal">Compte restaurant</h2>
          <p className="mt-3 text-sm font-medium text-charcoal">{user.company_name}</p>
          <p className="mt-1 text-xs text-charcoal/40">Slug : {user.slug}</p>
          <p className="mt-1 text-xs text-charcoal/40">
            Plan : {user.subscription_tier ?? 'Aucun'}
          </p>
          <button
            onClick={() => router.push(`/admin/restaurants/${user.tenant_id}`)}
            className="mt-4 rounded-lg border border-charcoal/8 px-3 py-1.5 text-xs text-charcoal/60 transition-colors hover:bg-cream-dark hover:text-charcoal"
          >
            Ouvrir le restaurant
          </button>
        </div>

        <div className="rounded-xl border border-charcoal/8 bg-white p-5">
          <h2 className="font-display text-sm font-bold text-charcoal">Activité</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-charcoal/8 bg-cream p-3">
              <p className="text-xs text-charcoal/40">Produits</p>
              <p className="mt-1 font-display text-lg font-bold text-charcoal">
                {user.productCount}
              </p>
            </div>
            <div className="rounded-lg border border-charcoal/8 bg-cream p-3">
              <p className="text-xs text-charcoal/40">Ventes</p>
              <p className="mt-1 font-display text-lg font-bold text-charcoal">
                {user.salesCount}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-charcoal/40">
            Créé le {new Date(user.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  );
}
