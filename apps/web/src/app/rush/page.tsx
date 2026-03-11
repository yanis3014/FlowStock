'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Product, StockStatus } from '@bmad/shared';

type Level = 'red' | 'orange' | 'green';

function stockStatusToLevel(status: StockStatus): Level {
  return status === 'critical' ? 'red' : status === 'low' ? 'orange' : 'green';
}

function unitLabel(unit: string): string {
  const map: Record<string, string> = {
    piece: 'pcs',
    kg: 'kg',
    liter: 'L',
    box: 'caisse',
    pack: 'pack',
  };
  return map[unit] ?? unit;
}

/**
 * Mode Rush — Priorité absolue (A.2)
 * Mobile-First, lisible en 2 secondes.
 * Esthétique "Mobile Rush Screen" du moodboard Warm Tech.
 */
export default function RushPage() {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  const loadProducts = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    fetchApi('/products?limit=100')
      .then((res) => {
        if (!res.ok) throw new Error('Erreur chargement');
        return res.json();
      })
      .then((json) => {
        if (json?.success && Array.isArray(json?.data)) {
          setProducts(json.data);
          setLastFetchTime(new Date());
        } else {
          setProducts([]);
        }
      })
      .catch(() => {
        setError('Impossible de charger les alertes.');
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [token, fetchApi]);

  useEffect(() => {
    if (!token && !isLoading) router.push('/login?returnUrl=/rush');
  }, [token, isLoading, router]);

  useEffect(() => {
    if (token) loadProducts();
  }, [token, loadProducts]);

  if (!token && isLoading) return null;
  if (!token) return null;

  const alerts = products
    .filter((p) => p.stock_status === 'critical' || p.stock_status === 'low' || p.stock_status === 'ok')
    .sort((a, b) => {
      const order = { critical: 0, low: 1, ok: 2 };
      return order[a.stock_status] - order[b.stock_status];
    })
    .map((p) => ({
      id: p.id,
      level: stockStatusToLevel(p.stock_status) as Level,
      name: p.name,
      detail: `${p.quantity} ${unitLabel(p.unit)} restantes`,
      badge: p.stock_status === 'critical' ? 'CRITIQUE' : p.stock_status === 'low' ? 'FAIBLE' : 'OK',
    }));

  return (
    <main
      className="flex min-h-screen min-h-dvh flex-col bg-charcoal px-4 pt-3 pb-6 safe-area-padding font-body"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
      }}
      role="main"
    >
      {/* Notch */}
      <div
        className="mx-auto mb-4 h-1.5 w-20 rounded-full bg-cream/15"
        aria-hidden
      />

      {/* Bandeau RUSH EN COURS + heure */}
      <header className="mb-3 flex items-center justify-between">
        <div
          className="inline-flex items-center gap-1.5 rounded-full border border-green-deep/60 bg-green-deep/20 px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-green-deep"
          aria-live="polite"
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-deep animate-rush-pulse"
            aria-hidden
          />
          RUSH EN COURS
        </div>
        <time className="font-display text-xs text-cream/50" dateTime={timeStr}>
          {timeStr}
        </time>
      </header>

      <h1 className="font-display text-xl font-bold text-cream">Alertes Stock</h1>
      <p className="mb-2 text-xs text-cream/50">14 tables · Service midi</p>
      <p className="mb-4 rounded-lg bg-cream/5 px-3 py-2 text-[11px] text-cream/50 border border-cream/10">
        {lastFetchTime
          ? `Mis à jour à ${lastFetchTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
          : loading
            ? 'Chargement...'
            : 'Données en cache'}
      </p>

      {loading && (
        <section className="flex flex-1 flex-col gap-2.5" aria-label="Chargement">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-cream/10" />
          ))}
        </section>
      )}

      {error && (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 py-8">
          <p className="text-sm text-terracotta">{error}</p>
          <button
            type="button"
            onClick={loadProducts}
            className="rounded-xl border border-cream/20 px-4 py-2 text-sm font-medium text-cream hover:bg-cream/10 transition-colors"
          >
            Réessayer
          </button>
        </section>
      )}

      {!loading && !error && alerts.length === 0 && (
        <section className="flex flex-1 flex-col items-center justify-center py-8">
          <p className="text-sm text-cream/50">Aucun produit trouvé</p>
        </section>
      )}

      {!loading && !error && alerts.length > 0 && (
        <section className="flex flex-1 flex-col gap-2.5 overflow-y-auto" aria-label="Alertes triées par criticité">
          {alerts.map((a) => (
            <article
              key={a.id}
              role={a.level === 'red' ? 'alert' : undefined}
              className={`flex items-center gap-3 rounded-xl px-4 py-3.5 bg-charcoal/50 ${
                a.level === 'red'
                  ? 'border border-terracotta/30'
                  : a.level === 'orange'
                    ? 'border border-gold/30'
                    : 'border border-green-deep/30'
              }`}
            >
              <span className="text-lg leading-none" aria-hidden>
                📦
              </span>
              <div className="min-w-0 flex-1">
                <span className="block font-display text-sm font-bold text-cream">
                  {a.name}
                </span>
                <span className={`mt-0.5 block text-[11px] ${
                  a.level === 'red' ? 'text-terracotta' : a.level === 'orange' ? 'text-gold' : 'text-green-deep'
                }`}>
                  {a.detail}
                </span>
              </div>
              <span
                className={`shrink-0 rounded-md px-2 py-1 font-display text-[11px] font-bold ${
                  a.level === 'red'
                    ? 'bg-terracotta/20 text-terracotta'
                    : a.level === 'orange'
                      ? 'bg-gold/20 text-gold'
                      : 'bg-green-deep/20 text-green-deep'
                }`}
              >
                {a.badge}
              </span>
            </article>
          ))}
        </section>
      )}

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          className="w-full rounded-xl bg-green-deep py-3.5 font-display text-sm font-bold tracking-wide text-cream transition-colors hover:bg-forest-green"
        >
          ✓ Tout acquitter
        </button>
        <Link
          href="/rush/stocks"
          className="w-full rounded-xl border border-cream/10 bg-transparent py-3 font-body text-[13px] font-medium text-cream/50 transition-colors hover:text-cream text-center"
        >
          Voir tous les stocks →
        </Link>
      </div>
    </main>
  );
}
