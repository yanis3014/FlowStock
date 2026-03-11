'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserX,
  CheckCircle,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  subscription_tier: string | null;
  onboarding_completed: boolean;
  suspended?: boolean;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const TIER_LABELS: Record<string, string> = {
  normal: 'Starter',
  premium: 'Growth',
  premium_plus: 'Scale',
};

const TIER_COLORS: Record<string, string> = {
  normal: 'bg-cream/10 text-cream/60',
  premium: 'bg-green-deep/20 text-green-deep',
  premium_plus: 'bg-gold/20 text-gold',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { fetchApi } = useApi();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: '20',
    });
    if (debouncedSearch) params.set('search', debouncedSearch);

    fetchApi(`/api/admin/users?${params.toString()}`)
      .then(async (r) => {
        const payload = (await r.json().catch(() => ({}))) as {
          success?: boolean;
          data?: { users?: AdminUser[]; pagination?: Pagination };
        };
        if (!r.ok || !payload.success || !payload.data) {
          throw new Error('users_fetch_failed');
        }
        setUsers(payload.data.users ?? []);
        setPagination(
          payload.data.pagination ?? {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 1,
          }
        );
      })
      .catch(() => toast.error('Impossible de charger les utilisateurs.'))
      .finally(() => setLoading(false));
  }, [fetchApi, page, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleSuspend = async (user: AdminUser) => {
    const confirmed = window.confirm(
      user.suspended
        ? `Réactiver le compte de ${user.name} ?`
        : `Suspendre le compte de ${user.name} ? Il ne pourra plus se connecter.`
    );
    if (!confirmed) return;

    try {
      const res = await fetchApi(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended: !user.suspended }),
      });
      if (!res.ok) throw new Error('update_failed');
      toast.success(user.suspended ? 'Compte réactivé.' : 'Compte suspendu.');
      fetchUsers();
    } catch {
      toast.error('Erreur lors de la modification.');
    }
  };

  const handleMakeAdmin = async (user: AdminUser) => {
    if (!window.confirm(`Donner les droits admin à ${user.name} ?`)) return;
    try {
      const res = await fetchApi(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' }),
      });
      if (!res.ok) throw new Error('update_failed');
      toast.success('Droits admin accordés.');
      fetchUsers();
    } catch {
      toast.error('Erreur lors de la modification.');
    }
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-cream">Utilisateurs</h1>
          <p className="mt-0.5 text-sm text-cream/40">{pagination.total} comptes au total</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="w-full rounded-lg border border-cream/10 bg-charcoal py-2.5 pl-9 pr-4 text-sm text-cream placeholder:text-cream/30 focus:border-green-deep focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-cream/5 bg-charcoal">
        {loading ? (
          <div className="divide-y divide-cream/5">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-4 px-5 py-4"
              >
                <div className="h-8 w-8 rounded-full bg-cream/5" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded bg-cream/5" />
                  <div className="h-2.5 w-48 rounded bg-cream/5" />
                </div>
                <div className="h-5 w-16 rounded-full bg-cream/5" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm text-cream/30">
            Aucun utilisateur trouvé.
          </div>
        ) : (
          <div className="divide-y divide-cream/5">
            {users.map((user) => (
              <div
                key={user.id}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-cream/[0.03]"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-deep/15">
                  <span className="text-xs font-bold text-green-deep">
                    {user.name?.charAt(0).toUpperCase() ?? '?'}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-cream">{user.name}</p>
                    {user.role === 'admin' && (
                      <span className="rounded bg-terracotta/15 px-1.5 py-0.5 text-xs font-medium text-terracotta">
                        Admin
                      </span>
                    )}
                    {user.suspended && (
                      <span className="rounded bg-terracotta/15 px-1.5 py-0.5 text-xs font-medium text-terracotta">
                        Suspendu
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-cream/40">{user.email}</p>
                </div>

                <span
                  className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    user.subscription_tier
                      ? TIER_COLORS[user.subscription_tier]
                      : 'bg-cream/5 text-cream/30'
                  }`}
                >
                  {user.subscription_tier
                    ? TIER_LABELS[user.subscription_tier]
                    : 'Aucun'}
                </span>

                <span className="hidden flex-shrink-0 text-xs text-cream/30 lg:block">
                  {new Date(user.created_at).toLocaleDateString('fr-FR')}
                </span>

                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                    className="rounded-lg p-1.5 text-cream/40 transition-colors hover:bg-cream/5 hover:text-cream"
                    title="Voir le détail"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleSuspend(user)}
                    className={`rounded-lg p-1.5 transition-colors ${
                      user.suspended
                        ? 'text-green-deep hover:bg-green-deep/10'
                        : 'text-terracotta hover:bg-terracotta/10'
                    }`}
                    title={user.suspended ? 'Réactiver' : 'Suspendre'}
                  >
                    {user.suspended ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <UserX className="h-4 w-4" />
                    )}
                  </button>
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => handleMakeAdmin(user)}
                      className="rounded-lg p-1.5 text-cream/40 transition-colors hover:bg-gold/10 hover:text-gold"
                      title="Promouvoir admin"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-cream/30">
            Page {page} / {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-cream/10 bg-charcoal p-2 text-cream/50 transition-colors hover:text-cream disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="rounded-lg border border-cream/10 bg-charcoal p-2 text-cream/50 transition-colors hover:text-cream disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
