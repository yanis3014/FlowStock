'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';

interface Restaurant {
  id: string;
  company_name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  user_count: number;
  product_count: number;
  subscription_tier: string | null;
  subscription_status: string | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminRestaurantsPage() {
  const { fetchApi } = useApi();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
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

  const fetchRestaurants = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (debouncedSearch) params.set('search', debouncedSearch);

    fetchApi(`/api/admin/restaurants?${params}`)
      .then(async (r) => {
        const payload = (await r.json().catch(() => ({}))) as {
          success?: boolean;
          data?: { restaurants?: Restaurant[]; pagination?: Pagination };
        };
        if (!r.ok || !payload.success || !payload.data) {
          throw new Error('restaurants_fetch_failed');
        }
        setRestaurants(payload.data.restaurants ?? []);
        setPagination(
          payload.data.pagination ?? {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 1,
          }
        );
      })
      .catch(() => toast.error('Impossible de charger les restaurants.'))
      .finally(() => setLoading(false));
  }, [fetchApi, page, debouncedSearch]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-cream">Restaurants</h1>
        <p className="mt-0.5 text-sm text-cream/40">{pagination.total} comptes</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (raison sociale, slug...)"
          className="w-full rounded-lg border border-cream/10 bg-charcoal py-2.5 pl-9 pr-4 text-sm text-cream placeholder:text-cream/30 focus:border-green-deep focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-cream/5 bg-charcoal">
        {loading ? (
          <div className="divide-y divide-cream/5">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-4 px-5 py-4">
                <div className="h-8 w-8 rounded bg-cream/5" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-48 rounded bg-cream/5" />
                  <div className="h-2.5 w-32 rounded bg-cream/5" />
                </div>
              </div>
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="py-16 text-center text-sm text-cream/30">
            Aucun restaurant trouvé.
          </div>
        ) : (
          <div className="divide-y divide-cream/5">
            {restaurants.map((r) => (
              <Link
                key={r.id}
                href={`/admin/restaurants/${r.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-cream/[0.03]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-terracotta/15">
                  <Store className="h-4 w-4 text-terracotta" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-cream">{r.company_name}</p>
                  <p className="truncate text-xs text-cream/40">{r.slug}</p>
                </div>
                <div className="hidden text-xs text-cream/40 md:block">
                  {r.user_count} utilisateur(s)
                </div>
                <div className="hidden text-xs text-cream/40 md:block">
                  {r.product_count} produit(s)
                </div>
                <div className="rounded-full bg-cream/10 px-2 py-0.5 text-xs text-cream/70">
                  {r.subscription_tier ?? 'Aucun plan'}
                </div>
              </Link>
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
              className="rounded-lg border border-cream/10 bg-charcoal p-2 text-cream/50 transition-colors hover:text-cream disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="rounded-lg border border-cream/10 bg-charcoal p-2 text-cream/50 transition-colors hover:text-cream disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
