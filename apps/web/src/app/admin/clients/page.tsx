'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

type Sante = 'actif' | 'risque_churn' | 'inactif';

interface ClientRow {
  id: string;
  company_name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  user_count: number;
  product_count: number;
  subscription_tier: string | null;
  subscription_status: string | null;
  last_login_at: string | null;
  sante: Sante;
  mrr: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const TIER_MRR: Record<string, number> = { normal: 29, premium: 89, premium_plus: 149 };

function computeSante(lastLoginAt: string | null): Sante {
  if (!lastLoginAt) return 'inactif';
  const diffDays = (Date.now() - new Date(lastLoginAt).getTime()) / 86400000;
  if (diffDays < 7) return 'actif';
  if (diffDays < 30) return 'risque_churn';
  return 'inactif';
}

const SANTE_LABELS: Record<Sante, string> = {
  actif: 'Actif',
  risque_churn: 'Risque churn',
  inactif: 'Inactif',
};

const SANTE_CLASSES: Record<Sante, string> = {
  actif: 'bg-green-deep/10 text-green-deep',
  risque_churn: 'bg-gold/20 text-gold',
  inactif: 'bg-charcoal/8 text-charcoal/50',
};

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Jamais';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Il y a moins d\'1h';
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `Il y a ${diffD}j`;
  return `Il y a ${Math.floor(diffD / 30)} mois`;
}

export default function AdminClientsPage() {
  const { fetchApi } = useApi();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSante, setFilterSante] = useState<Sante | ''>('');
  const [page, setPage] = useState(1);

  const fetchClients = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search.trim()) params.set('search', search.trim());

    fetchApi(`/api/admin/restaurants?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((payload: { success?: boolean; data?: { restaurants: Omit<ClientRow, 'sante' | 'mrr'>[]; pagination: Pagination } } | null) => {
        if (!payload?.success || !payload.data) return;
        const enriched: ClientRow[] = payload.data.restaurants.map((r) => ({
          ...r,
          sante: computeSante(r.last_login_at ?? null),
          mrr: TIER_MRR[r.subscription_tier ?? ''] ?? 0,
          last_login_at: r.last_login_at ?? null,
        }));
        const filtered = filterSante ? enriched.filter((c) => c.sante === filterSante) : enriched;
        setClients(filtered);
        setPagination(payload.data.pagination);
      })
      .finally(() => setLoading(false));
  }, [fetchApi, page, search, filterSante]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-charcoal">Clients CRM</h1>
        <p className="mt-0.5 text-sm text-charcoal/40">
          Suivi de la santé client et engagement
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
          <input
            type="search"
            placeholder="Rechercher un restaurant…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg border border-charcoal/8 bg-white py-2 pl-9 pr-3 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-green-deep/40 focus:outline-none focus:ring-1 focus:ring-green-deep/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-charcoal/40">Santé :</span>
          {(['', 'actif', 'risque_churn', 'inactif'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setFilterSante(s); setPage(1); }}
              className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                filterSante === s
                  ? s === ''
                    ? 'bg-charcoal text-cream'
                    : SANTE_CLASSES[s as Sante]
                  : 'bg-white border border-charcoal/8 text-charcoal/60 hover:bg-cream-dark'
              }`}
            >
              {s === '' ? 'Tous' : SANTE_LABELS[s as Sante]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-charcoal/8 bg-white">
        {loading ? (
          <div className="space-y-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse border-b border-charcoal/5 last:border-0" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-sm text-charcoal/40">Aucun client trouvé.</div>
        ) : (
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-charcoal/8 bg-cream">
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-charcoal/50">Restaurant</th>
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-charcoal/50">Plan</th>
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-charcoal/50">Inscription</th>
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-charcoal/50">MRR</th>
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-charcoal/50">Dernière connexion</th>
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-charcoal/50">Santé</th>
                <th className="px-4 py-3" aria-label="Action" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-charcoal/5 transition-colors hover:bg-cream last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-charcoal">{c.company_name}</p>
                    <p className="text-xs text-charcoal/40">{c.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-green-deep/10 px-2 py-0.5 text-xs font-medium text-green-deep">
                      {c.subscription_tier ?? 'Aucun'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-charcoal/60">
                    {new Date(c.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 font-display font-bold text-charcoal">
                    {c.mrr > 0
                      ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(c.mrr)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-charcoal/60">
                    {formatRelativeDate(c.last_login_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SANTE_CLASSES[c.sante]}`}>
                      {SANTE_LABELS[c.sante]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/clients/${c.id}`}
                      className="text-sm font-medium text-green-deep hover:underline"
                    >
                      Voir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-charcoal/40">
            {pagination.total} restaurants · Page {pagination.page}/{pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-lg border border-charcoal/8 bg-white px-3 py-1.5 text-sm text-charcoal/60 transition-colors hover:bg-cream-dark disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Préc.
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="flex items-center gap-1 rounded-lg border border-charcoal/8 bg-white px-3 py-1.5 text-sm text-charcoal/60 transition-colors hover:bg-cream-dark disabled:opacity-40"
            >
              Suiv.
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
