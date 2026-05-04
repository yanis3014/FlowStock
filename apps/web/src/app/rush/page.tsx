'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Product, Recipe, StockStatus } from '@bmad/shared';

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
  const [timeStr, setTimeStr] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rushToken = searchParams.get('token');
  const isTokenMode = Boolean(rushToken);

  const [restaurantName, setRestaurantName] = useState<string>('FlowStock');
  const [products, setProducts] = useState<Array<Product & { prediction?: { days_remaining: number | null } | null }>>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'low' | 'ok'>('all');
  const [localQtys, setLocalQtys] = useState<Record<string, number>>({});
  const [disabledDishIds, setDisabledDishIds] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url: string;
      if (isTokenMode) {
        url = `/rush/data?token=${encodeURIComponent(rushToken ?? '')}`;
      } else {
        url = '/products?limit=100&low_stock=false';
      }

      if (isTokenMode) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`);
        if (!res.ok) {
          if (res.status === 403) throw new Error('token_invalid');
          throw new Error('Erreur chargement');
        }
        const json = (await res.json().catch(() => ({}))) as any;
        const data = json?.data;
        setRestaurantName(typeof data?.restaurant_name === 'string' ? data.restaurant_name : 'Restaurant');
        setProducts(Array.isArray(data?.products) ? data.products : []);
        setRecipes([]);
      } else {
        const [productsRes, recipesRes] = await Promise.all([
          fetchApi(url),
          fetchApi('/recipes?limit=100'),
        ]);
        if (!productsRes.ok) throw new Error('Erreur chargement');
        if (!recipesRes.ok) throw new Error('Erreur chargement');

        const productsJson = (await productsRes.json().catch(() => ({}))) as any;
        const recipesJson = (await recipesRes.json().catch(() => ({}))) as any;
        setRestaurantName('FlowStock');
        setProducts(productsJson?.success && Array.isArray(productsJson?.data) ? productsJson.data : []);
        setRecipes(Array.isArray(recipesJson?.data) ? recipesJson.data : []);
      }

      setLastFetchTime(new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      setError(
        msg === 'token_invalid'
          ? 'Ce lien est invalide ou a été révoqué. Demandez un nouveau QR code au gérant.'
          : 'Impossible de charger les données.'
      );
      setProducts([]);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [isTokenMode, rushToken, fetchApi]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTimeStr(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isTokenMode && !token && !isLoading) router.push('/login?returnUrl=/rush');
  }, [isTokenMode, token, isLoading, router]);

  useEffect(() => {
    if (isTokenMode) {
      loadData();
      const interval = setInterval(loadData, 30_000);
      return () => clearInterval(interval);
    }
    if (token) {
      loadData();
      const interval = setInterval(loadData, 30_000);
      return () => clearInterval(interval);
    }
    return;
  }, [isTokenMode, token, loadData]);

  // Sync local qtys quand les produits chargent
  useEffect(() => {
    const init: Record<string, number> = {};
    products.forEach((p) => { init[p.id] = p.quantity; });
    setLocalQtys(init);
  }, [products]);

  const handleQtyChange = useCallback(async (id: string, delta: number) => {
    const prev = localQtys[id] ?? 0;
    const next = Math.max(0, prev + delta);
    setLocalQtys((q) => ({ ...q, [id]: next }));
    try {
      const url = isTokenMode
        ? `${process.env.NEXT_PUBLIC_API_URL}/rush/stocks/${id}?token=${encodeURIComponent(rushToken ?? '')}`
        : `${process.env.NEXT_PUBLIC_API_URL}/products/${id}/quantity`;
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(isTokenMode ? {} : { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ quantity: next }),
      });
    } catch {
      setLocalQtys((q) => ({ ...q, [id]: prev }));
    }
  }, [localQtys, isTokenMode, rushToken, token]);

  const dishes = useMemo(() => {
    const byProductId = new Map(products.map((p) => [p.id, p]));
    return recipes
      .filter((r) => r.is_active)
      .map((recipe) => {
        const isDisabled = Boolean(disabledDishIds[recipe.id]);
        const linkedIngredients = recipe.ingredients.filter((i) => i.product_id && i.quantity > 0);
        const computed = linkedIngredients.map((i) => {
          const product = byProductId.get(i.product_id as string);
          const availableQty = product ? (localQtys[product.id] ?? product.quantity) : 0;
          return {
            ingredientName: i.ingredient_name,
            portions: Math.floor(availableQty / i.quantity),
          };
        });
        const minPortions = computed.length > 0 ? Math.min(...computed.map((x) => x.portions)) : 0;
        const missingLinks = recipe.ingredients.some((i) => !i.product_id || !byProductId.has(i.product_id));
        const portions = isDisabled ? 0 : (missingLinks ? 0 : Math.max(0, minPortions));
        const stockStatus: StockStatus = portions <= 0 ? 'critical' : portions <= 3 ? 'low' : 'ok';
        const limiting = computed.sort((a, b) => a.portions - b.portions)[0]?.ingredientName ?? null;
        return {
          id: recipe.id,
          name: recipe.name,
          category: recipe.category,
          ingredientsCount: recipe.ingredients.length,
          portions,
          stock_status: stockStatus,
          limitingIngredient: limiting,
          disabled: isDisabled,
          hasRecipeLinks: recipe.ingredients.length > 0 && !missingLinks,
        };
      })
      .sort((a, b) => {
        const order: Record<StockStatus, number> = { critical: 0, low: 1, ok: 2 };
        return order[a.stock_status] - order[b.stock_status] || a.name.localeCompare(b.name);
      });
  }, [recipes, products, localQtys, disabledDishIds]);

  const counts = useMemo(() => {
    const critical = dishes.filter((d) => d.stock_status === 'critical').length;
    const low = dishes.filter((d) => d.stock_status === 'low').length;
    const ok = dishes.filter((d) => d.stock_status === 'ok').length;
    return { critical, low, ok };
  }, [dishes]);

  const filteredAlerts = useMemo(() => {
    if (filter === 'critical') return dishes.filter((d) => d.stock_status === 'critical');
    if (filter === 'low') return dishes.filter((d) => d.stock_status === 'low');
    if (filter === 'ok') return dishes.filter((d) => d.stock_status === 'ok');
    return dishes;
  }, [dishes, filter]);

  const criticalProduct = useMemo(
    () => dishes.find((d) => d.stock_status === 'critical') ?? null,
    [dishes]
  );

  if (!isTokenMode && !token && isLoading) return null;
  if (!isTokenMode && !token) return null;

  return (
    <main
      className="min-h-screen bg-[#F4F1EC] font-body"
      role="main"
    >
      <header className="w-full bg-[#184C3F] px-4 py-3 text-white shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-tight">FlowStock</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-green-300" aria-hidden />
              RUSH
            </span>
            <span className="text-sm text-white/70">Vue Serveur</span>
          </div>
          <div className="flex items-center gap-5 text-right">
            <div>
              <p className="text-2xl font-bold leading-none text-green-300">{counts.ok}</p>
              <p className="text-[10px] uppercase tracking-wide text-white/70">Dispo</p>
            </div>
            <div>
              <p className="text-2xl font-bold leading-none text-gold">{counts.low + counts.critical}</p>
              <p className="text-[10px] uppercase tracking-wide text-white/70">Limités</p>
            </div>
            <div className="text-lg font-semibold">{timeStr}</div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#E8D9C9] bg-[#FFF8EF] px-4 py-3">
          <p className="mr-2 text-xs font-semibold uppercase tracking-wide text-[#B76B2A]">Alerte ingrédients</p>
          {products
            .filter((p) => p.stock_status === 'critical' || p.stock_status === 'low')
            .slice(0, 3)
            .map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 rounded-full border border-[#E3C8A7] bg-[#FFF2E3] px-3 py-1 text-sm text-[#A85D22]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#D8843A]" aria-hidden />
                {p.name} · {localQtys[p.id] ?? p.quantity}
                {' '}{unitLabel(p.unit)}
              </span>
            ))}
        </div>
        {counts.critical > 0 && criticalProduct && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-terracotta">{criticalProduct.name} — rupture imminente</p>
              <p className="mt-0.5 text-xs text-terracotta/70">
                {criticalProduct.portions} portion{criticalProduct.portions > 1 ? 's' : ''} restante{criticalProduct.portions > 1 ? 's' : ''}
                {criticalProduct.limitingIngredient ? ` · limité par ${criticalProduct.limitingIngredient}` : ''}
              </p>
            </div>
            <button className="min-h-[44px] shrink-0 rounded-lg bg-terracotta px-3 py-2 text-xs font-semibold text-white">
              Commander
            </button>
          </div>
        )}

        {!loading && !error && recipes.length === 0 && (
          <section className="flex min-h-[48vh] flex-col items-center justify-center rounded-2xl border border-charcoal/10 bg-white px-6 text-center">
            <p className="text-xl font-semibold text-charcoal">Veuillez remplir votre menu pour activer la Vue Serveur</p>
            <p className="mt-2 max-w-xl text-sm text-charcoal/60">
              Ajoutez vos plats et leurs recettes pour calculer automatiquement les portions disponibles.
            </p>
            <Link
              href="/onboarding/menu"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#184C3F] px-4 py-2 text-sm font-semibold text-white"
            >
              Configurer mon menu
            </Link>
          </section>
        )}

        {recipes.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
          {([
            { key: 'all', label: `Tous ${dishes.length}` },
            { key: 'ok', label: `Disponibles ${counts.ok}` },
            { key: 'low', label: `Limités ${counts.low}` },
            { key: 'critical', label: `Épuisés ${counts.critical}` },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                filter === tab.key
                  ? 'bg-[#184C3F] text-white shadow-sm'
                  : 'bg-white text-charcoal/60 ring-1 ring-charcoal/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
          </div>
        )}

        {loading && recipes.length > 0 && (
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Chargement">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-44 w-full rounded-2xl" />
            ))}
          </section>
        )}

        {error && (
          <section className="flex flex-col items-center justify-center gap-4 py-8">
            <p className="text-center text-sm text-terracotta">{error}</p>
            <button
              type="button"
              onClick={loadData}
              className="min-h-[52px] rounded-xl bg-terracotta px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Réessayer
            </button>
          </section>
        )}

        {!loading && !error && recipes.length > 0 && filteredAlerts.length === 0 && (
          <section className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-charcoal/50">Aucun produit trouvé</p>
          </section>
        )}

        {!loading && !error && recipes.length > 0 && filteredAlerts.length > 0 && (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Alertes triées par criticité">
            {filteredAlerts.map((dish) => {
              return (
                <article
                  key={dish.id}
                  className="rounded-2xl border border-[#E8DCCF] bg-white shadow-[0_1px_2px_rgba(25,25,25,0.06)]"
                >
                  <div className="p-4">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="text-3xl/none font-bold tracking-tight text-charcoal">{dish.name}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                          dish.stock_status === 'critical'
                            ? 'bg-terracotta/10 text-terracotta'
                            : dish.stock_status === 'low'
                              ? 'bg-gold/15 text-[#B6741C]'
                              : 'bg-green-deep/10 text-green-deep'
                        }`}
                      >
                        {dish.stock_status === 'critical' ? 'Épuisé' : dish.stock_status === 'low' ? 'Limité' : 'Disponible'}
                      </span>
                    </div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/35">PLAT</p>
                    <p className="text-4xl font-black leading-none text-[#CC7A25]">
                      {dish.portions}
                      <span className="ml-1 text-base font-semibold text-charcoal/45">portions restantes</span>
                    </p>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-charcoal/10">
                      <div
                        className={`h-full rounded-full transition-all ${
                          dish.stock_status === 'critical' ? 'bg-terracotta' :
                          dish.stock_status === 'low' ? 'bg-[#CC7A25]' : 'bg-[#2C7A69]'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round(
                            (dish.portions / 10) * 100
                          ))}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-[#EFE7DE] px-4 py-3">
                    <p className="text-sm text-charcoal/55">
                      {dish.ingredientsCount} ingrédient{dish.ingredientsCount > 1 ? 's' : ''}
                      {' · '}
                      {dish.hasRecipeLinks
                        ? dish.limitingIngredient
                          ? `Limité par — ${dish.limitingIngredient}`
                          : 'Aucune limite'
                        : 'Recette incomplète'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDisabledDishIds((prev) => ({ ...prev, [dish.id]: !prev[dish.id] }))}
                        className="min-h-[40px] rounded-xl bg-red-alert/10 px-4 py-2 text-sm font-semibold text-red-alert hover:bg-red-alert/15"
                      >
                        {dish.disabled ? 'Réactiver' : 'Désactiver'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {!isTokenMode && (
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#184C3F] py-3.5 text-sm font-semibold text-white"
            >
              Générer commande fournisseur
              {counts.critical > 0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {counts.critical} urgent{counts.critical > 1 ? 's' : ''}
                </span>
              )}
            </button>
            <Link
              href="/stocks"
              className="py-3 text-center text-sm text-charcoal/55 hover:text-charcoal"
            >
              Voir tous les stocks →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
