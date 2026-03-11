'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Copy, Pencil, AlertTriangle } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost: string;
  absent?: boolean;
}

interface FicheDetail {
  id: string;
  name: string;
  ingredients: Ingredient[];
  costMatiere: string;
}

const MOCK_FICHES: Record<string, FicheDetail> = {
  '1': {
    id: '1',
    name: 'Burger maison',
    costMatiere: '8,20 €',
    ingredients: [
      { id: 'i1', name: 'Pain burger', quantity: 1, unit: 'unité', cost: '0,80 €' },
      { id: 'i2', name: 'Steak haché 150g', quantity: 1, unit: 'unité', cost: '3,50 €' },
      { id: 'i3', name: 'Salade', quantity: 20, unit: 'g', cost: '0,20 €' },
      { id: 'i4', name: 'Tomate', quantity: 30, unit: 'g', cost: '0,30 €' },
      { id: 'i5', name: 'Sauce maison', quantity: 25, unit: 'g', cost: '3,40 €' },
    ],
  },
  '2': {
    id: '2',
    name: 'Dos de saumon',
    costMatiere: '12,50 €',
    ingredients: [
      { id: 'i1', name: 'Saumon frais', quantity: 180, unit: 'g', cost: '9,00 €', absent: true },
      { id: 'i2', name: 'Beurre', quantity: 15, unit: 'g', cost: '0,40 €' },
      { id: 'i3', name: 'Aneth', quantity: 5, unit: 'g', cost: '0,30 €' },
      { id: 'i4', name: 'Citron', quantity: 20, unit: 'g', cost: '2,80 €' },
    ],
  },
  '3': {
    id: '3',
    name: 'Salade César',
    costMatiere: '6,80 €',
    ingredients: [
      { id: 'i1', name: 'Poulet grillé', quantity: 80, unit: 'g', cost: '2,40 €' },
      { id: 'i2', name: 'Salade romaine', quantity: 80, unit: 'g', cost: '0,60 €' },
      { id: 'i3', name: 'Parmesan', quantity: 15, unit: 'g', cost: '0,90 €' },
      { id: 'i4', name: 'Croûtons', quantity: 25, unit: 'g', cost: '0,50 €' },
      { id: 'i5', name: 'Sauce César', quantity: 40, unit: 'g', cost: '2,20 €' },
      { id: 'i6', name: 'Bacon', quantity: 15, unit: 'g', cost: '0,20 €' },
    ],
  },
  '4': {
    id: '4',
    name: 'Crème brûlée',
    costMatiere: '3,20 €',
    ingredients: [
      { id: 'i1', name: 'Crème fraîche', quantity: 80, unit: 'ml', cost: '0,80 €' },
      { id: 'i2', name: 'Jaunes d\'œufs', quantity: 1.5, unit: 'unité', cost: '0,45 €' },
      { id: 'i3', name: 'Sucre', quantity: 25, unit: 'g', cost: '0,15 €' },
      { id: 'i4', name: 'Vanille', quantity: 2, unit: 'g', cost: '1,80 €' },
    ],
  },
  '5': {
    id: '5',
    name: 'Risotto aux cèpes',
    costMatiere: '9,40 €',
    ingredients: [
      { id: 'i1', name: 'Riz arborio', quantity: 80, unit: 'g', cost: '0,80 €' },
      { id: 'i2', name: 'Cèpes', quantity: 40, unit: 'g', cost: '3,20 €', absent: true },
      { id: 'i3', name: 'Bouillon', quantity: 200, unit: 'ml', cost: '0,40 €' },
      { id: 'i4', name: 'Parmesan', quantity: 25, unit: 'g', cost: '1,50 €' },
      { id: 'i5', name: 'Beurre', quantity: 20, unit: 'g', cost: '0,50 €' },
      { id: 'i6', name: 'Vin blanc', quantity: 50, unit: 'ml', cost: '2,00 €' },
      { id: 'i7', name: 'Oignon', quantity: 30, unit: 'g', cost: '1,00 €' },
    ],
  },
};

export default function FicheTechniqueDetailPage() {
  useAuth(); // Auth guard in layout
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [fiche, setFiche] = useState<FicheDetail | null>(null);

  useEffect(() => {
    if (id && MOCK_FICHES[id]) setFiche(MOCK_FICHES[id]);
    else setFiche(null);
  }, [id]);

  if (!fiche) {
    return (
      <div className="min-h-full bg-cream p-4">
        <Link href="/fiches-techniques" className="text-green-mid hover:underline">
          ← Retour aux fiches
        </Link>
        <p className="mt-4 text-gray-warm">Fiche non trouvée.</p>
      </div>
    );
  }

  const hasAlert = fiche.ingredients.some((i) => i.absent);

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
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-deep/20 px-3 py-1.5 text-sm font-medium text-green-deep"
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-deep/20 px-3 py-1.5 text-sm font-medium text-green-deep"
            >
              <Copy className="h-4 w-4" />
              Dupliquer
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h1 className="font-display text-2xl font-bold text-green-deep">{fiche.name}</h1>
          <p className="mt-1 text-sm text-gray-warm">
            Coût matière total : <span className="font-display font-bold text-charcoal">{fiche.costMatiere}</span>
          </p>
          {hasAlert && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-orange-warn/15 px-3 py-2 text-sm font-medium text-orange-warn">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Un ou plusieurs ingrédients sont absents du stock — vérifiez avant de proposer ce plat.
            </div>
          )}

          <h2 className="mt-6 font-display text-lg font-bold text-green-deep">Ingrédients</h2>
          <ul className="mt-3 space-y-2">
            {fiche.ingredients.map((ing) => (
              <li
                key={ing.id}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                  ing.absent ? 'border-orange-warn/40 bg-orange-warn/5' : 'border-green-deep/10 bg-cream/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-charcoal">{ing.name}</span>
                  {ing.absent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-warn/20 px-2 py-0.5 text-xs font-semibold text-orange-warn">
                      <AlertTriangle className="h-3 w-3" />
                      Absent
                    </span>
                  )}
                </div>
                <div className="text-right text-sm">
                  <span className="font-display font-bold text-green-deep">
                    {ing.quantity} {ing.unit}
                  </span>
                  <span className="ml-2 text-gray-warm">{ing.cost}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
