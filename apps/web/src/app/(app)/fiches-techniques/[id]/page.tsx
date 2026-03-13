'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { ArrowLeft, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import type { Recipe } from '@bmad/shared';

function confidenceBadgeClass(c: 'high' | 'medium' | 'low' | null): string {
  if (c === 'high') return 'bg-green-bright/20 text-green-deep border-green-bright/30';
  if (c === 'medium') return 'bg-gold/15 text-gold-dark border-gold/30';
  if (c === 'low') return 'bg-terracotta/10 text-terracotta border-terracotta/30';
  return '';
}

function confidenceLabel(c: 'high' | 'medium' | 'low' | null): string {
  if (c === 'high') return 'Haute confiance';
  if (c === 'medium') return 'Confiance moyenne';
  if (c === 'low') return 'Basse confiance';
  return '';
}

export default function FicheTechniqueDetailPage() {
  useAuth();
  const params = useParams();
  const { fetchApi, token } = useApi();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || !token) return;
    setLoading(true);
    setNotFound(false);
    fetchApi(`/recipes/${id}`)
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error('Erreur lors du chargement');
        const json = (await res.json()) as { data?: Recipe };
        setRecipe(json.data ?? null);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, token, fetchApi]);

  if (loading) {
    return (
      <div className="min-h-full bg-cream flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-green-deep" />
      </div>
    );
  }

  if (notFound || !recipe) {
    return (
      <div className="min-h-full bg-cream p-4">
        <Link href="/fiches-techniques" className="inline-flex items-center gap-1 text-sm text-green-mid hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Fiches techniques
        </Link>
        <p className="mt-4 text-gray-warm">Fiche technique non trouvée.</p>
      </div>
    );
  }

  const hasAbsent = recipe.ingredients.some((i) => !i.product_id);

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-2xl space-y-6 p-4 pb-24 md:pb-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/fiches-techniques"
            className="inline-flex items-center gap-1 text-sm font-medium text-green-mid hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Fiches techniques
          </Link>
        </div>

        <div className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-green-deep">{recipe.name}</h1>
              {recipe.category && (
                <p className="mt-0.5 text-sm text-charcoal/50">{recipe.category}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {recipe.source === 'scan_ia' && recipe.confidence && (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${confidenceBadgeClass(recipe.confidence)}`}>
                  {confidenceLabel(recipe.confidence)}
                </span>
              )}
              {recipe.source === 'scan_ia' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-charcoal/8 px-2 py-0.5 text-xs text-charcoal/50">
                  Extrait par IA
                </span>
              )}
            </div>
          </div>

          {recipe.ai_note && (
            <p className="mt-2 text-xs italic text-charcoal/40">{recipe.ai_note}</p>
          )}

          {hasAbsent && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-gold/10 px-3 py-2 text-sm font-medium text-gold-dark">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Certains ingrédients ne sont pas liés au catalogue — pensez à les associer.
            </div>
          )}

          <h2 className="mt-6 font-display text-lg font-bold text-green-deep">Ingrédients</h2>
          {recipe.ingredients.length === 0 ? (
            <p className="mt-3 text-sm text-charcoal/50">Aucun ingrédient enregistré.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recipe.ingredients.map((ing) => (
                <li
                  key={ing.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    !ing.product_id
                      ? 'border-gold/30 bg-gold/5'
                      : 'border-green-deep/10 bg-cream/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-charcoal">{ing.ingredient_name}</span>
                    {ing.product_id ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-bright/15 px-2 py-0.5 text-xs font-semibold text-green-deep">
                        <CheckCircle className="h-3 w-3" />
                        Lié
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-gold-dark">
                        <AlertTriangle className="h-3 w-3" />
                        Non lié
                      </span>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <span className="font-display font-bold text-green-deep">
                      {ing.quantity} {ing.unit}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
