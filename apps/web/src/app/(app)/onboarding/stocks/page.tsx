'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import type { OnboardingProgressData } from '@/types/onboarding';

type StocksMode = 'SELECT' | 'CSV' | 'GUIDED';

interface RecipeIngredient {
  ingredient_name: string;
  unit: string;
}

interface Recipe {
  id: string;
  name: string;
  category?: string;
  recipe_ingredients?: RecipeIngredient[];
}

interface Location {
  id: string;
  name: string;
}

interface IngredientEntry {
  ingredient_name: string;
  unit: string;
  quantity: number;
  location_id: string;
}

export default function StocksPage() {
  const { fetchApi } = useApi();
  const router = useRouter();
  const [mode, setMode] = useState<StocksMode>('SELECT');
  const [prevData, setPrevData] = useState<OnboardingProgressData | null>(null);
  const [ingredients, setIngredients] = useState<IngredientEntry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasRecipes, setHasRecipes] = useState(true);
  const [renseignes, setRenseignes] = useState(0);

  useEffect(() => {
    fetchApi('/onboarding/progress')
      .then((r) => r.json())
      .then((res: { data?: { onboarding_data: OnboardingProgressData | null } }) => {
        setPrevData(res?.data?.onboarding_data ?? null);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadGuidedData = async () => {
    const [recipesRes, locationsRes] = await Promise.all([
      fetchApi('/recipes?limit=100').then((r) => r.json()),
      fetchApi('/locations').then((r) => r.json()),
    ]);

    const recipes: Recipe[] = recipesRes?.data ?? [];
    const locs: Location[] = locationsRes?.data ?? [];
    setLocations(locs);

    if (recipes.length === 0) {
      setHasRecipes(false);
      return;
    }

    // Dédupliquer les ingrédients par nom
    const seen = new Set<string>();
    const allIngredients: IngredientEntry[] = [];
    for (const recipe of recipes) {
      for (const ing of recipe.recipe_ingredients ?? []) {
        const key = ing.ingredient_name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          allIngredients.push({
            ingredient_name: ing.ingredient_name,
            unit: ing.unit,
            quantity: 0,
            location_id: locs[0]?.id ?? '',
          });
        }
      }
    }
    setIngredients(allIngredients);
    setHasRecipes(allIngredients.length > 0);
  };

  const handleSelectCSV = async () => {
    const prev = prevData ?? { completed_steps: [], current_step: 'stocks' as const };
    await fetchApi('/onboarding/progress', {
      method: 'PATCH',
      body: JSON.stringify({ onboarding: { ...prev, stocks_mode: 'csv' } }),
    });
    router.push('/import-stocks?fromOnboarding=1');
  };

  const handleSelectGuided = async () => {
    setMode('GUIDED');
    await loadGuidedData();
  };

  const updateIngredient = (index: number, field: keyof IngredientEntry, value: string | number) => {
    const updated = ingredients.map((ing, i) => i === index ? { ...ing, [field]: value } : ing);
    setIngredients(updated);
    setRenseignes(updated.filter((ing) => ing.quantity > 0).length);
  };

  const handleSaveGuided = async () => {
    setSaving(true);
    try {
      await Promise.allSettled(
        ingredients.map((ing) => {
          const sku = ing.ingredient_name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 25)
            + '-' + Math.random().toString(36).slice(2, 6);
          return fetchApi('/products', {
            method: 'POST',
            body: JSON.stringify({
              sku,
              name: ing.ingredient_name,
              unit: ing.unit,
              quantity: ing.quantity,
              location_id: ing.location_id || undefined,
            }),
          });
        })
      );
      const prev = prevData ?? { completed_steps: [], current_step: 'stocks' as const };
      const completed = prev.completed_steps ?? [];
      await fetchApi('/onboarding/progress', {
        method: 'PATCH',
        body: JSON.stringify({
          onboarding: {
            ...prev,
            stocks_mode: 'guided',
            stocks_count: ingredients.length,
            completed_steps: completed.includes('stocks') ? completed : [...completed, 'stocks'],
            current_step: 'fournisseurs',
          },
        }),
      });
      router.push('/onboarding/fournisseurs');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Inventaire initial</h1>
        <p className="text-charcoal/60 mt-1 text-sm">
          Initialisez votre stock de départ pour commencer à suivre vos niveaux.
        </p>
      </div>

      {mode === 'SELECT' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleSelectCSV}
            className="bg-white border-2 border-charcoal/15 rounded-xl p-6 flex flex-col gap-3 text-left hover:border-[#1C2B2A] transition-colors"
          >
            <div className="w-10 h-10 bg-[#1C2B2A]/10 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-charcoal">Uploader un fichier CSV</p>
              <p className="text-sm text-charcoal/60 mt-1">Importez vos stocks depuis un fichier Excel ou CSV</p>
            </div>
          </button>
          <button
            type="button"
            onClick={handleSelectGuided}
            className="bg-white border-2 border-charcoal/15 rounded-xl p-6 flex flex-col gap-3 text-left hover:border-[#1C2B2A] transition-colors"
          >
            <div className="w-10 h-10 bg-[#1C2B2A]/10 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-charcoal">Saisie guidée par ingrédient</p>
              <p className="text-sm text-charcoal/60 mt-1">Renseignez les quantités depuis vos recettes</p>
            </div>
          </button>
        </div>
      )}

      {mode === 'GUIDED' && (
        <div className="flex flex-col gap-4">
          {!hasRecipes ? (
            <div className="bg-white rounded-xl border border-charcoal/10 p-8 flex flex-col items-center gap-3 text-center">
              <p className="font-semibold text-charcoal">Aucune recette trouvée</p>
              <p className="text-sm text-charcoal/60">
                Ajoutez d&apos;abord des recettes à l&apos;étape 2 pour utiliser la saisie guidée.
              </p>
              <button
                type="button"
                onClick={handleSelectCSV}
                className="text-sm text-green-deep underline"
              >
                Passer en mode CSV
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-charcoal/60">
                  <span className="font-semibold text-charcoal">{renseignes}</span>/{ingredients.length} ingrédients renseignés
                </p>
                <div className="flex-1 mx-4 h-2 bg-charcoal/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-bright transition-all"
                    style={{ width: ingredients.length > 0 ? `${(renseignes / ingredients.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {ingredients.map((ing, i) => (
                  <div key={i} className="bg-white rounded-xl border border-charcoal/10 p-4 flex flex-wrap items-center gap-3">
                    <span className="flex-1 min-w-[120px] text-sm font-medium text-charcoal">{ing.ingredient_name}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(i, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-20 border border-charcoal/20 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-charcoal/40"
                      />
                      <span className="text-xs text-charcoal/50 w-10">{ing.unit}</span>
                    </div>
                    <select
                      value={ing.location_id}
                      onChange={(e) => updateIngredient(i, 'location_id', e.target.value)}
                      className="text-sm border border-charcoal/20 rounded-lg px-2 py-1 bg-white focus:outline-none"
                    >
                      <option value="">Emplacement</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSaveGuided}
                disabled={saving}
                className="bg-[#1C2B2A] text-white px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 min-h-[44px] self-end"
              >
                {saving ? 'Enregistrement…' : 'Valider →'}
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={() => mode === 'SELECT' ? router.push('/onboarding/emplacements') : setMode('SELECT')}
          className="text-sm text-charcoal/60 hover:text-charcoal min-h-[44px] px-2"
        >
          ← Précédent
        </button>
      </div>
    </div>
  );
}
