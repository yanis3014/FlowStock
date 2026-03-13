'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Camera, AlertTriangle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import type { Recipe } from '@bmad/shared';

export default function FichesTechniquesPage() {
  useAuth();
  const { fetchApi, token } = useApi();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetchApi(`/recipes?${params.toString()}`);
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? 'Erreur lors du chargement');
      }
      const json = (await res.json()) as { data?: Recipe[] };
      setRecipes(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setLoading(false);
    }
  }, [fetchApi, token, search]);

  useEffect(() => {
    const timeout = setTimeout(() => { void fetchRecipes(); }, search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [fetchRecipes, search]);

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-4xl space-y-6 p-6 pb-24 md:pb-6">
        <PageHeader
          title="Fiches techniques"
          subtitle="Recettes et décompositions des plats"
          actions={
            <div className="flex gap-2">
              <Link
                href="/menu-scan"
                className="inline-flex items-center gap-2 rounded-xl border border-charcoal/20 bg-transparent px-4 py-2.5 font-display text-sm font-bold text-charcoal hover:bg-charcoal/5 transition-colors"
              >
                <Camera className="h-4 w-4" />
                Par photo
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-green-deep px-4 py-2.5 font-display text-sm font-bold text-cream hover:bg-forest-green transition-colors"
              >
                <Plus className="h-4 w-4" />
                Création manuelle
              </button>
            </div>
          }
        />

        <input
          type="search"
          placeholder="Rechercher un plat…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-charcoal/15 bg-white px-4 py-2.5 text-sm text-charcoal placeholder-charcoal/30 focus:border-green-deep focus:outline-none focus:ring-1 focus:ring-green-deep/20 transition-colors"
        />

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-green-deep" />
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-3 rounded-xl border border-red-alert/20 bg-red-alert/5 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-alert" />
            <p className="text-sm text-red-alert">{error}</p>
          </div>
        )}

        {!loading && !error && recipes.length === 0 && (
          <div className="rounded-2xl border border-charcoal/8 bg-white p-12 text-center">
            <Camera className="mx-auto h-10 w-10 text-charcoal/20 mb-4" />
            <p className="font-display font-bold text-charcoal">Aucune fiche technique</p>
            <p className="mt-1 text-sm text-charcoal/50">
              {search
                ? 'Aucun résultat pour cette recherche.'
                : 'Photographiez votre menu ou créez manuellement vos premières fiches.'}
            </p>
            {!search && (
              <Link
                href="/menu-scan"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-deep px-4 py-2.5 font-display text-sm font-bold text-cream hover:bg-forest-green transition-colors"
              >
                <Camera className="h-4 w-4" />
                Scanner mon menu
              </Link>
            )}
          </div>
        )}

        {!loading && !error && recipes.length > 0 && (
          <ul className="space-y-3">
            {recipes.map((recipe) => {
              const hasAbsent = recipe.ingredients.some((i) => !i.product_id);
              return (
                <li key={recipe.id}>
                  <Link
                    href={`/fiches-techniques/${recipe.id}`}
                    className="flex items-center justify-between rounded-xl border border-charcoal/8 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="font-display font-bold text-charcoal truncate">{recipe.name}</p>
                        <p className="text-sm text-charcoal/50">
                          {recipe.ingredients.length} ingrédient{recipe.ingredients.length > 1 ? 's' : ''}
                          {recipe.category && ` · ${recipe.category}`}
                          {recipe.source === 'scan_ia' && ' · IA'}
                        </p>
                      </div>
                      {hasAbsent && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Non lié
                        </span>
                      )}
                    </div>
                    <span className="text-charcoal/50 shrink-0">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
