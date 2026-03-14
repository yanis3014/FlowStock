'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

interface Subscription {
  id: string;
  user_name: string | null;
  user_email: string | null;
  company_name: string;
  tier: 'normal' | 'premium' | 'premium_plus';
  status: string;
  created_at: string;
}

const TIERS = [
  { value: 'normal', label: 'Starter' },
  { value: 'premium', label: 'Growth' },
  { value: 'premium_plus', label: 'Scale' },
];

const TIER_COLORS: Record<string, string> = {
  normal: 'bg-charcoal/8 text-charcoal/60',
  premium: 'bg-green-deep/20 text-green-deep',
  premium_plus: 'bg-gold/20 text-gold',
};

export default function AdminSubscriptionsPage() {
  const { fetchApi } = useApi();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [changingId, setChangingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('tier', filter);

    fetchApi(`/api/admin/subscriptions?${params.toString()}`)
      .then(async (r) => {
        const payload = (await r.json().catch(() => ({}))) as {
          success?: boolean;
          data?: { subscriptions?: Subscription[] };
        };
        if (!r.ok || !payload.success || !payload.data) {
          throw new Error('subscriptions_fetch_failed');
        }
        setSubs(payload.data.subscriptions ?? []);
      })
      .catch(() => toast.error('Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, [fetchApi, filter]);

  const handleChangeTier = async (sub: Subscription, newTier: string) => {
    if (newTier === sub.tier) return;
    if (
      !window.confirm(
        `Changer ${
          sub.user_name ?? sub.company_name
        } vers le plan ${TIERS.find((t) => t.value === newTier)?.label} ?`
      )
    ) {
      return;
    }

    setChangingId(sub.id);
    try {
      const res = await fetchApi(`/api/admin/subscriptions/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier }),
      });
      if (!res.ok) throw new Error('update_failed');
      toast.success('Plan mis à jour.');
      setSubs((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, tier: newTier as Subscription['tier'] } : s))
      );
    } catch {
      toast.error('Erreur lors de la modification.');
    } finally {
      setChangingId(null);
    }
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-charcoal">Abonnements</h1>
          <p className="mt-0.5 text-sm text-charcoal/40">{subs.length} abonnements</p>
        </div>

        <div className="flex gap-2">
          {[{ value: 'all', label: 'Tous' }, ...TIERS].map((tier) => (
            <button
              key={tier.value}
              onClick={() => setFilter(tier.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === tier.value
                  ? 'bg-green-deep text-cream'
                  : 'border border-charcoal/8 bg-white text-charcoal/50 hover:bg-cream-dark'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-charcoal/8 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-charcoal/30">Chargement...</div>
        ) : subs.length === 0 ? (
          <div className="p-12 text-center text-sm text-charcoal/30">
            Aucun abonnement trouvé.
          </div>
        ) : (
          <div className="divide-y divide-charcoal/5">
            {subs.map((sub) => (
              <div key={sub.id} className="flex items-center gap-4 px-5 py-4 hover:bg-cream">
                <CreditCard className="h-4 w-4 flex-shrink-0 text-charcoal/30" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-charcoal">
                    {sub.user_name ?? sub.company_name}
                  </p>
                  <p className="truncate text-xs text-charcoal/40">
                    {sub.user_email ?? sub.company_name}
                  </p>
                </div>
                <span className="hidden text-xs text-charcoal/30 md:block">
                  {new Date(sub.created_at).toLocaleDateString('fr-FR')}
                </span>
                <select
                  value={sub.tier}
                  onChange={(e) => handleChangeTier(sub, e.target.value)}
                  disabled={changingId === sub.id}
                  className={`cursor-pointer rounded-lg border-0 px-2 py-1 text-xs font-medium disabled:opacity-50 ${TIER_COLORS[sub.tier]}`}
                  style={{ backgroundColor: 'transparent' }}
                >
                  {TIERS.map((t) => (
                    <option key={t.value} value={t.value} className="bg-white text-charcoal">
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
