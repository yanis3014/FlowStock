'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';

type StatutFeedback = 'nouveau' | 'lu' | 'traite';

interface FeedbackRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  type: string;
  message: string;
  tags: string[];
  status: StatutFeedback;
  created_at: string;
  company_name: string;
  user_email: string | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUT_LABELS: Record<StatutFeedback, string> = {
  nouveau: 'Nouveau',
  lu: 'Lu',
  traite: 'Traité',
};

const STATUT_CLASSES: Record<StatutFeedback, string> = {
  nouveau: 'bg-terracotta/10 text-terracotta',
  lu: 'bg-gold/20 text-gold',
  traite: 'bg-green-deep/10 text-green-deep',
};

const TYPE_LABELS: Record<string, string> = {
  bug: 'Bug',
  suggestion: 'Suggestion',
  amelioration: 'Amélioration',
};

export default function AdminFeedbackPage() {
  const { fetchApi } = useApi();
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState<StatutFeedback | 'all'>('all');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (filterStatut !== 'all') params.set('status', filterStatut);

    fetchApi(`/api/admin/feedback?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((payload: { success?: boolean; data?: { feedbacks: FeedbackRow[]; pagination: Pagination } } | null) => {
        if (!payload?.success || !payload.data) return;
        setFeedbacks(payload.data.feedbacks);
        setPagination(payload.data.pagination);
      })
      .finally(() => setLoading(false));
  }, [fetchApi, page, filterStatut]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleUpdateStatus = useCallback(async (id: string, status: 'lu' | 'traite') => {
    setUpdatingId(id);
    try {
      const r = await fetchApi(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error('update_failed');
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status } : f))
      );
      toast.success('Statut mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdatingId(null);
    }
  }, [fetchApi]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-charcoal">Feedback & Support</h1>
        <p className="mt-0.5 text-sm text-charcoal/40">
          Retours utilisateurs envoyés par les restaurants
        </p>
      </div>

      <div className="flex items-center gap-2">
        {(['all', 'nouveau', 'lu', 'traite'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setFilterStatut(s); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filterStatut === s
                ? s === 'all'
                  ? 'bg-charcoal text-cream'
                  : STATUT_CLASSES[s as StatutFeedback]
                : 'border border-charcoal/8 bg-white text-charcoal/60 hover:bg-cream-dark'
            }`}
          >
            {s === 'all' ? 'Tous' : STATUT_LABELS[s as StatutFeedback]}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-charcoal/8 bg-white">
        {loading ? (
          <div className="space-y-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse border-b border-charcoal/5 last:border-0" />
            ))}
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="p-8 text-center text-sm text-charcoal/40">
            Aucun feedback {filterStatut !== 'all' ? `avec le statut "${STATUT_LABELS[filterStatut as StatutFeedback]}"` : ''}.
          </div>
        ) : (
          <ul className="divide-y divide-charcoal/5">
            {feedbacks.map((f) => (
              <li key={f.id} className="p-4 transition-colors hover:bg-cream">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-charcoal">{f.company_name}</span>
                      {f.user_email && (
                        <span className="text-xs text-charcoal/40">{f.user_email}</span>
                      )}
                      <span className="text-xs text-charcoal/30">
                        {new Date(f.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="rounded-full bg-charcoal/8 px-2 py-0.5 text-xs font-medium text-charcoal/60">
                        {TYPE_LABELS[f.type] ?? f.type}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-charcoal">{f.message}</p>
                    {f.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {f.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-green-deep/8 px-2 py-0.5 text-xs text-green-deep"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUT_CLASSES[f.status]}`}>
                      {STATUT_LABELS[f.status]}
                    </span>
                    {f.status !== 'traite' && (
                      <div className="flex gap-1">
                        {f.status === 'nouveau' && (
                          <button
                            type="button"
                            disabled={updatingId === f.id}
                            onClick={() => handleUpdateStatus(f.id, 'lu')}
                            className="rounded-lg border border-charcoal/8 px-2 py-1 text-xs text-charcoal/60 transition-colors hover:bg-cream-dark disabled:opacity-40"
                          >
                            Marquer lu
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={updatingId === f.id}
                          onClick={() => handleUpdateStatus(f.id, 'traite')}
                          className="rounded-lg border border-green-deep/20 bg-green-deep/5 px-2 py-1 text-xs text-green-deep transition-colors hover:bg-green-deep/10 disabled:opacity-40"
                        >
                          Traité
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-charcoal/40">
            {pagination.total} feedbacks · Page {pagination.page}/{pagination.totalPages}
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
