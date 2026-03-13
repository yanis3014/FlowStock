'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Loader2, AlertCircle, Plus, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { extractMenuFromImage } from './actions';
import type { ExtractedDish, ExtractedIngredient, Recipe, ExtractionFeedbackCreateInput } from '@bmad/shared';

// ─── Types locaux ──────────────────────────────────────────────────────────────

interface EditableIngredient extends ExtractedIngredient {
  _id: string;
  product_id?: string | null;
}

interface EditableDish {
  _id: string;
  nom: string;
  categorie: string;
  confiance: 'high' | 'medium' | 'low';
  note: string;
  ingredients: EditableIngredient[];
  originalAi: ExtractedDish;
  validated: boolean;
  saving: boolean;
  saved: boolean;
  savedRecipeId?: string;
}

type Step = 'IDLE' | 'EXTRACTING' | 'REVIEW' | 'ALL_SAVED';

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return `_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function confidenceBadgeClass(c: 'high' | 'medium' | 'low'): string {
  if (c === 'high') return 'bg-green-bright/20 text-green-deep border-green-bright/30';
  if (c === 'medium') return 'bg-gold/15 text-gold border-gold/30';
  return 'bg-terracotta/10 text-terracotta border-terracotta/30';
}

function confidenceLabel(c: 'high' | 'medium' | 'low'): string {
  if (c === 'high') return 'Haute confiance';
  if (c === 'medium') return 'Confiance moyenne';
  return 'Basse confiance';
}

function toEditableDish(dish: ExtractedDish): EditableDish {
  return {
    _id: uid(),
    nom: dish.nom,
    categorie: dish.categorie ?? '',
    confiance: dish.confiance,
    note: dish.note ?? '',
    ingredients: dish.ingredients.map((ing) => ({ ...ing, _id: uid(), product_id: null })),
    originalAi: dish,
    validated: false,
    saving: false,
    saved: false,
  };
}

// ─── Composant carte ingrédient ─────────────────────────────────────────────────

function IngredientRow({
  ing,
  onChange,
  onRemove,
  searchProducts,
}: {
  ing: EditableIngredient;
  onChange: (updated: EditableIngredient) => void;
  onRemove: () => void;
  searchProducts: (q: string) => Promise<ProductOption[]>;
}) {
  const [suggestions, setSuggestions] = useState<ProductOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleNameChange = async (val: string) => {
    onChange({ ...ing, nom: val, product_id: null });
    if (val.length >= 2) {
      setSearching(true);
      const results = await searchProducts(val);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSearching(false);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelect = (p: ProductOption) => {
    onChange({ ...ing, nom: p.name, product_id: p.id, unite: p.unit });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="grid grid-cols-[1fr_80px_80px_32px] gap-2 items-center">
      <div className="relative">
        <div className="flex items-center gap-1.5">
          {searching && <Loader2 className="absolute left-2.5 h-3.5 w-3.5 animate-spin text-charcoal/40" />}
          {ing.product_id && <Search className="absolute left-2.5 h-3.5 w-3.5 text-green-deep" />}
          <input
            type="text"
            value={ing.nom}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Ingrédient"
            className={`w-full rounded-lg border border-charcoal/15 px-3 py-1.5 text-sm text-charcoal placeholder-charcoal/30 focus:border-green-deep focus:outline-none transition-colors ${
              ing.product_id ? 'pl-8 bg-green-deep/3 border-green-deep/30' : ''
            }`}
          />
        </div>
        {showSuggestions && (
          <ul className="absolute top-full left-0 z-10 mt-1 w-full rounded-lg border border-charcoal/15 bg-white shadow-lg">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(p)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-cream transition-colors"
                >
                  <span className="font-medium text-charcoal">{p.name}</span>
                  <span className="ml-2 text-xs text-charcoal/50">{p.sku}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <input
        type="number"
        value={ing.quantite}
        min={0.001}
        step={0.001}
        onChange={(e) => onChange({ ...ing, quantite: parseFloat(e.target.value) || 0 })}
        className="rounded-lg border border-charcoal/15 px-2 py-1.5 text-sm text-charcoal text-right focus:border-green-deep focus:outline-none transition-colors"
      />
      <input
        type="text"
        value={ing.unite}
        onChange={(e) => onChange({ ...ing, unite: e.target.value })}
        placeholder="unité"
        className="rounded-lg border border-charcoal/15 px-2 py-1.5 text-sm text-charcoal focus:border-green-deep focus:outline-none transition-colors"
      />
      <button
        type="button"
        onClick={onRemove}
        className="rounded-lg p-1 text-charcoal/30 hover:bg-red-alert/10 hover:text-red-alert transition-colors"
        aria-label="Supprimer l'ingrédient"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Composant carte plat ───────────────────────────────────────────────────────

function DishCard({
  dish,
  onUpdate,
  onValidate,
  searchProducts,
}: {
  dish: EditableDish;
  onUpdate: (d: EditableDish) => void;
  onValidate: (d: EditableDish) => void;
  searchProducts: (q: string) => Promise<ProductOption[]>;
}) {
  const [expanded, setExpanded] = useState(true);

  if (dish.saved) {
    return (
      <div className="rounded-2xl border border-green-bright/30 bg-green-bright/5 p-4 flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-green-deep">{dish.nom}</p>
          <p className="text-sm text-charcoal/50">{dish.ingredients.length} ingrédients enregistrés</p>
        </div>
        <div className="flex items-center gap-2 text-green-deep">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Enregistré</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border bg-white shadow-sm transition-all ${
      dish.validated ? 'border-green-deep/30' : 'border-charcoal/10'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={dish.nom}
              onChange={(e) => onUpdate({ ...dish, nom: e.target.value })}
              className="font-display font-bold text-charcoal text-lg bg-transparent border-b border-transparent hover:border-charcoal/20 focus:border-green-deep focus:outline-none transition-colors"
              aria-label="Nom du plat"
            />
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${confidenceBadgeClass(dish.confiance)}`}>
              {confidenceLabel(dish.confiance)}
            </span>
          </div>
          {dish.categorie && (
            <p className="mt-0.5 text-sm text-charcoal/50">{dish.categorie}</p>
          )}
          {dish.note && (
            <p className="mt-1 text-xs italic text-charcoal/40">{dish.note}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-lg p-1.5 text-charcoal/40 hover:bg-cream transition-colors"
          aria-label={expanded ? 'Réduire' : 'Développer'}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* En-tête colonnes */}
          <div className="grid grid-cols-[1fr_80px_80px_32px] gap-2 text-xs font-semibold text-charcoal/40 uppercase tracking-wider px-0.5">
            <span>Ingrédient</span>
            <span className="text-right">Qté</span>
            <span>Unité</span>
            <span />
          </div>

          {/* Ingrédients */}
          <div className="space-y-2">
            {dish.ingredients.map((ing) => (
              <IngredientRow
                key={ing._id}
                ing={ing}
                onChange={(updated) =>
                  onUpdate({
                    ...dish,
                    ingredients: dish.ingredients.map((i) =>
                      i._id === ing._id ? updated : i
                    ),
                  })
                }
                onRemove={() =>
                  onUpdate({
                    ...dish,
                    ingredients: dish.ingredients.filter((i) => i._id !== ing._id),
                  })
                }
                searchProducts={searchProducts}
              />
            ))}
          </div>

          {/* Ajouter un ingrédient */}
          <button
            type="button"
            onClick={() =>
              onUpdate({
                ...dish,
                ingredients: [
                  ...dish.ingredients,
                  { _id: uid(), nom: '', quantite: 0.1, unite: 'kg', product_id: null },
                ],
              })
            }
            className="flex items-center gap-1.5 text-sm text-green-deep hover:underline"
          >
            <Plus className="h-4 w-4" />
            Ajouter un ingrédient
          </button>

          {/* Bouton valider */}
          <div className="flex justify-end pt-2 border-t border-charcoal/8">
            <button
              type="button"
              disabled={dish.saving || dish.ingredients.length === 0}
              onClick={() => onValidate(dish)}
              className="inline-flex items-center gap-2 rounded-xl bg-green-deep px-4 py-2 font-display text-sm font-bold text-cream hover:bg-forest-green disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {dish.saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Valider cette fiche
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page principale ────────────────────────────────────────────────────────────

export default function MenuScanPage() {
  useAuth();
  const { fetchApi, token } = useApi();

  const [step, setStep] = useState<Step>('IDLE');
  const [dishes, setDishes] = useState<EditableDish[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [validatingAll, setValidatingAll] = useState(false);

  const searchProducts = useCallback(
    async (q: string): Promise<ProductOption[]> => {
      if (!token) return [];
      try {
        const res = await fetchApi(`/products?search=${encodeURIComponent(q)}&limit=5`);
        if (!res.ok) return [];
        const json = (await res.json()) as { success: boolean; data?: ProductOption[] };
        return json.data ?? [];
      } catch {
        return [];
      }
    },
    [fetchApi, token]
  );

  const getRecentFeedbacks = useCallback(async () => {
    if (!token) return [];
    try {
      const res = await fetchApi('/extraction-feedback?limit=3');
      if (!res.ok) return [];
      const json = (await res.json()) as {
        success: boolean;
        data?: Array<{ correction_humaine: ExtractedDish }>;
      };
      return (json.data ?? []).map((f) => f.correction_humaine);
    } catch {
      return [];
    }
  }, [fetchApi, token]);

  const handleImageSelected = useCallback(
    async (_file: File, dataUrl: string) => {
      setStep('EXTRACTING');
      setError(null);

      const feedbacks = await getRecentFeedbacks();
      const result = await extractMenuFromImage(dataUrl, feedbacks);

      if (!result.success) {
        setError(result.error);
        setStep('IDLE');
        return;
      }

      setDishes(result.data.plats.map(toEditableDish));
      setStep('REVIEW');
    },
    [getRecentFeedbacks]
  );

  const handleUpdateDish = useCallback((updated: EditableDish) => {
    setDishes((prev) => prev.map((d) => (d._id === updated._id ? updated : d)));
  }, []);

  const saveDish = useCallback(
    async (dish: EditableDish): Promise<boolean> => {
      if (!token) return false;

      setDishes((prev) =>
        prev.map((d) => (d._id === dish._id ? { ...d, saving: true } : d))
      );

      try {
        const res = await fetchApi('/recipes', {
          method: 'POST',
          body: JSON.stringify({
            name: dish.nom,
            category: dish.categorie || undefined,
            source: 'scan_ia',
            confidence: dish.confiance,
            ai_note: dish.note || undefined,
            ingredients: dish.ingredients
              .filter((i) => i.nom.trim() && i.quantite > 0)
              .map((i, idx) => ({
                product_id: i.product_id ?? null,
                ingredient_name: i.nom,
                quantity: i.quantite,
                unit: i.unite,
                sort_order: idx,
              })),
          }),
        });

        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          throw new Error(json.error ?? 'Erreur lors de l\'enregistrement');
        }

        const json = (await res.json()) as { data?: Recipe };
        const savedId = json.data?.id;

        setDishes((prev) =>
          prev.map((d) =>
            d._id === dish._id ? { ...d, saving: false, saved: true, savedRecipeId: savedId } : d
          )
        );

        // Enregistrer le feedback (corrections vs extraction IA initiale)
        const hasChanged =
          dish.nom !== dish.originalAi.nom ||
          JSON.stringify(
            dish.ingredients.map((i) => ({ nom: i.nom, quantite: i.quantite, unite: i.unite }))
          ) !==
            JSON.stringify(
              dish.originalAi.ingredients.map((i) => ({
                nom: i.nom,
                quantite: i.quantite,
                unite: i.unite,
              }))
            );

        if (hasChanged) {
          const feedbackPayload: ExtractionFeedbackCreateInput = {
            plat_nom: dish.nom,
            extraction_ia: dish.originalAi,
            correction_humaine: {
              nom: dish.nom,
              categorie: dish.categorie || undefined,
              ingredients: dish.ingredients.map((i) => ({
                nom: i.nom,
                quantite: i.quantite,
                unite: i.unite,
              })),
              confiance: dish.confiance,
              note: dish.note || undefined,
            },
          };

          fetchApi('/extraction-feedback', {
            method: 'POST',
            body: JSON.stringify(feedbackPayload),
          }).catch(() => {/* non-bloquant */});
        }

        return true;
      } catch (err) {
        setDishes((prev) =>
          prev.map((d) => (d._id === dish._id ? { ...d, saving: false } : d))
        );
        toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
        return false;
      }
    },
    [fetchApi, token]
  );

  const handleValidateDish = useCallback(
    async (dish: EditableDish) => {
      const ok = await saveDish(dish);
      if (ok) {
        toast.success(`"${dish.nom}" enregistrée avec succès`);
      }
    },
    [saveDish]
  );

  const handleValidateAll = useCallback(async () => {
    setValidatingAll(true);
    const pending = dishes.filter((d) => !d.saved);
    let allOk = true;
    for (const dish of pending) {
      const ok = await saveDish(dish);
      if (!ok) allOk = false;
    }
    setValidatingAll(false);
    if (allOk) {
      toast.success('Toutes les fiches techniques ont été enregistrées !');
    }
  }, [dishes, saveDish]);

  const savedCount = dishes.filter((d) => d.saved).length;
  const totalCount = dishes.length;
  const allSaved = totalCount > 0 && savedCount === totalCount;

  // Détecte quand toutes les fiches ont été enregistrées
  useEffect(() => {
    if (step === 'REVIEW' && allSaved) {
      setStep('ALL_SAVED');
    }
  }, [allSaved, step]);

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-3xl space-y-6 p-6 pb-24 md:pb-6">
        <PageHeader
          title="Scan menu IA"
          subtitle="Photographiez votre carte pour extraire automatiquement les fiches techniques"
          actions={
            <Link
              href="/fiches-techniques"
              className="inline-flex items-center gap-1.5 rounded-xl border border-charcoal/20 px-4 py-2.5 font-display text-sm font-bold text-charcoal hover:bg-charcoal/5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
          }
        />

        {/* Zone de dépôt — visible en IDLE et REVIEW */}
        {(step === 'IDLE' || step === 'REVIEW') && (
          <div className="rounded-2xl border border-charcoal/8 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-display font-bold text-green-deep">
              {step === 'REVIEW' ? 'Analyser un autre menu' : 'Photo de votre menu'}
            </h2>
            <FileUploadZone
              onFileSelected={handleImageSelected}
              readAs="dataUrl"
              disabled={false}
            />
          </div>
        )}

        {/* État : extraction en cours */}
        {step === 'EXTRACTING' && (
          <div className="rounded-2xl border border-charcoal/8 bg-white p-10 shadow-sm flex flex-col items-center gap-4">
            <div className="rounded-full bg-green-deep/10 p-5">
              <Loader2 className="h-8 w-8 animate-spin text-green-deep" />
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-green-deep text-lg">Analyse en cours…</p>
              <p className="mt-1 text-sm text-charcoal/50">
                GPT-4o Vision lit votre menu et identifie les plats et leurs ingrédients.
              </p>
            </div>
            {/* Skeleton */}
            <div className="w-full space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-charcoal/8 bg-cream/50 p-4 animate-pulse">
                  <div className="h-5 w-1/3 rounded bg-charcoal/10 mb-3" />
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded bg-charcoal/8" />
                    <div className="h-3 w-4/5 rounded bg-charcoal/8" />
                    <div className="h-3 w-3/5 rounded bg-charcoal/8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Erreur */}
        {error && step === 'IDLE' && (
          <div className="flex items-start gap-3 rounded-xl border border-red-alert/20 bg-red-alert/5 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-alert mt-0.5" />
            <div>
              <p className="font-display font-bold text-red-alert text-sm">Extraction échouée</p>
              <p className="text-sm text-red-alert/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* État : review — cartes des plats */}
        {(step === 'REVIEW' || step === 'ALL_SAVED') && dishes.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-green-deep">
                  {totalCount} plat{totalCount > 1 ? 's' : ''} identifié{totalCount > 1 ? 's' : ''}
                </h2>
                {savedCount > 0 && (
                  <p className="text-sm text-charcoal/50">
                    {savedCount}/{totalCount} enregistré{savedCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {!allSaved && (
                <button
                  type="button"
                  disabled={validatingAll || dishes.every((d) => d.saved)}
                  onClick={handleValidateAll}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-deep px-4 py-2.5 font-display text-sm font-bold text-cream hover:bg-forest-green disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {validatingAll ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Valider tout ({totalCount - savedCount})
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="space-y-4">
              {dishes.map((dish) => (
                <DishCard
                  key={dish._id}
                  dish={dish}
                  onUpdate={handleUpdateDish}
                  onValidate={handleValidateDish}
                  searchProducts={searchProducts}
                />
              ))}
            </div>
          </div>
        )}

        {/* Succès total */}
        {step === 'ALL_SAVED' && (
          <div className="rounded-2xl border border-green-bright/30 bg-green-bright/5 p-6 text-center space-y-3">
            <div className="mx-auto rounded-full bg-green-deep/10 p-4 w-fit">
              <CheckCircle className="h-8 w-8 text-green-deep" />
            </div>
            <h3 className="font-display font-bold text-green-deep text-xl">
              {savedCount} fiche{savedCount > 1 ? 's' : ''} enregistrée{savedCount > 1 ? 's' : ''} !
            </h3>
            <p className="text-sm text-charcoal/60">
              Vos fiches techniques sont disponibles dans la section Fiches techniques.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link
                href="/fiches-techniques"
                className="inline-flex items-center gap-2 rounded-xl bg-green-deep px-5 py-2.5 font-display text-sm font-bold text-cream hover:bg-forest-green transition-colors"
              >
                Voir mes fiches
              </Link>
              <button
                type="button"
                onClick={() => { setStep('IDLE'); setDishes([]); setError(null); }}
                className="inline-flex items-center gap-2 rounded-xl border border-charcoal/20 px-5 py-2.5 font-display text-sm font-bold text-charcoal hover:bg-charcoal/5 transition-colors"
              >
                Nouveau scan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
