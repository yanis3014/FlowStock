'use client';
import type { MenuPlatLocal } from '@/types/onboarding';

interface MenuCardProps {
  plat: MenuPlatLocal;
  onUpdate: (p: MenuPlatLocal) => void;
  onDelete: () => void;
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-green-bright/15 text-green-bright',
  medium: 'bg-orange-warn/15 text-orange-warn',
  low: 'bg-red-alert/15 text-red-alert',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Faible',
};

export function MenuCard({ plat, onUpdate, onDelete }: MenuCardProps) {
  const updateIngredient = (
    index: number,
    field: 'nom' | 'quantite' | 'unite',
    value: string | number
  ) => {
    const newIngredients = plat.ingredients.map((ing, i) =>
      i === index ? { ...ing, [field]: value } : ing
    );
    onUpdate({ ...plat, ingredients: newIngredients });
  };

  const removeIngredient = (index: number) => {
    onUpdate({ ...plat, ingredients: plat.ingredients.filter((_, i) => i !== index) });
  };

  const addIngredient = () => {
    onUpdate({
      ...plat,
      ingredients: [...plat.ingredients, { nom: '', quantite: 0, unite: 'pièce' }],
    });
  };

  return (
    <div className="bg-white rounded-xl border border-charcoal/10 p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <input
          className="flex-1 font-semibold text-charcoal bg-transparent border-b border-transparent hover:border-charcoal/20 focus:border-charcoal/40 focus:outline-none text-base"
          value={plat.nom}
          onChange={(e) => onUpdate({ ...plat, nom: e.target.value })}
          placeholder="Nom du plat"
        />
        <span className="text-xs px-2 py-0.5 rounded bg-charcoal/10 text-charcoal/60 flex-shrink-0">
          {plat.categorie}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${CONFIDENCE_STYLES[plat.confiance] ?? 'bg-charcoal/10'}`}
        >
          {CONFIDENCE_LABELS[plat.confiance] ?? plat.confiance}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {plat.ingredients.map((ing, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="flex-1 text-sm border border-charcoal/15 rounded-lg px-2 py-1 focus:outline-none focus:border-charcoal/40"
              value={ing.nom}
              onChange={(e) => updateIngredient(i, 'nom', e.target.value)}
              placeholder="Ingrédient"
            />
            <input
              type="number"
              min={0.001}
              step={0.001}
              className="w-20 text-sm border border-charcoal/15 rounded-lg px-2 py-1 focus:outline-none focus:border-charcoal/40"
              value={ing.quantite}
              onChange={(e) => updateIngredient(i, 'quantite', parseFloat(e.target.value) || 0)}
            />
            <input
              className="w-16 text-sm border border-charcoal/15 rounded-lg px-2 py-1 focus:outline-none focus:border-charcoal/40"
              value={ing.unite}
              onChange={(e) => updateIngredient(i, 'unite', e.target.value)}
              placeholder="unité"
            />
            <button
              type="button"
              onClick={() => removeIngredient(i)}
              className="text-charcoal/40 hover:text-red-alert flex-shrink-0"
              aria-label="Supprimer l'ingrédient"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addIngredient}
        className="text-sm text-green-deep underline text-left"
      >
        + Ingrédient
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="flex items-center gap-1 text-sm text-red-alert mt-1 self-start"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
        Supprimer ce plat
      </button>
    </div>
  );
}
