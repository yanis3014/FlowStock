'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
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

function levelPct(p: Product): number {
  if (p.min_quantity != null && p.min_quantity > 0) {
    return Math.min(100, Math.round((p.quantity / p.min_quantity) * 100));
  }
  return p.stock_status === 'critical' ? 15 : p.stock_status === 'low' ? 40 : 90;
}

export default function RushStocksPage() {
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  const loadProducts = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    fetchApi('/products?limit=200')
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
        setError('Impossible de charger les stocks.');
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [token, fetchApi]);

  useEffect(() => {
    if (!token && !isLoading) router.push('/login?returnUrl=/rush/stocks');
  }, [token, isLoading, router]);

  useEffect(() => {
    if (token) loadProducts();
  }, [token, loadProducts]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  if (!token && isLoading) return null;
  if (!token) return null;

  return (
    <main
      className="flex min-h-screen min-h-dvh flex-col bg-[#0F1B19] px-4 pt-3 pb-6 font-body"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
      }}
      role="main"
    >
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/rush"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-warm hover:text-cream"
        >
          <ArrowLeft className="h-4 w-4" />
          Alertes
        </Link>
        <p className="text-[11px] text-gray-warm">
          {lastFetchTime
            ? `Mis à jour à ${lastFetchTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            : loading
              ? 'Chargement...'
              : 'Données en cache'}
        </p>
      </div>

      <h1 className="font-display text-xl font-bold text-cream">Détail stock</h1>
      <p className="mb-4 text-xs text-gray-warm">Niveaux en temps réel</p>

      <input
        type="search"
        placeholder="Rechercher un ingrédient…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-cream placeholder-gray-warm focus:border-green-bright focus:outline-none"
      />

      {loading && (
        <section className="flex-1 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/10" />
          ))}
        </section>
      )}

      {error && (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 py-8">
          <p className="text-sm text-red-alert">{error}</p>
          <button
            type="button"
            onClick={loadProducts}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-cream hover:bg-white/10"
          >
            Réessayer
          </button>
        </section>
      )}

      {!loading && !error && filtered.length === 0 && (
        <section className="flex flex-1 flex-col items-center justify-center py-8">
          <p className="text-sm text-gray-warm">Aucun produit trouvé</p>
        </section>
      )}

      {!loading && !error && filtered.length > 0 && (
        <section className="flex-1 space-y-3 overflow-y-auto">
          {filtered.map((item) => {
            const level = stockStatusToLevel(item.stock_status);
            const pct = levelPct(item);
            const levelColor =
              level === 'red' ? 'bg-red-alert' : level === 'orange' ? 'bg-orange-warn' : 'bg-green-bright';
            return (
              <article
                key={item.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-cream">{item.name}</p>
                    <p className="mt-1 text-2xl font-display font-extrabold text-cream">
                      {item.quantity}{' '}
                      <span className="text-sm font-normal text-gray-warm">
                        {unitLabel(item.unit)}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-white/20 px-2 py-1 text-[10px] font-semibold text-gray-warm hover:bg-white/10"
                  >
                    Ajustement manuel
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${levelColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-warm">{pct}%</span>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <button
        type="button"
        onClick={loadProducts}
        disabled={loading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-gray-warm hover:bg-white/5 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        Rafraîchir
      </button>
    </main>
  );
}
