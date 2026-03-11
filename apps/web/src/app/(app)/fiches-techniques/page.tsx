'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Camera, Copy, AlertTriangle } from 'lucide-react';

interface FicheResume {
  id: string;
  name: string;
  ingredientCount: number;
  costMatiere: string;
  hasAlert: boolean;
}

const MOCK_FICHES: FicheResume[] = [
  { id: '1', name: 'Burger maison', ingredientCount: 5, costMatiere: '8,20 €', hasAlert: false },
  { id: '2', name: 'Dos de saumon', ingredientCount: 4, costMatiere: '12,50 €', hasAlert: true },
  { id: '3', name: 'Salade César', ingredientCount: 6, costMatiere: '6,80 €', hasAlert: false },
  { id: '4', name: 'Crème brûlée', ingredientCount: 4, costMatiere: '3,20 €', hasAlert: false },
  { id: '5', name: 'Risotto aux cèpes', ingredientCount: 7, costMatiere: '9,40 €', hasAlert: true },
];

export default function FichesTechniquesPage() {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? MOCK_FICHES.filter((f) => f.name.toLowerCase().includes(search.trim().toLowerCase()))
    : MOCK_FICHES;

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-4xl space-y-6 p-4 pb-24 md:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-green-deep">Fiches techniques</h1>
            <p className="text-sm text-gray-warm">Recettes et décompositions des plats</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-green-mid bg-transparent px-4 py-2.5 font-display text-sm font-bold text-green-deep"
            >
              <Camera className="h-4 w-4" />
              Par photo
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-green-mid px-4 py-2.5 font-display text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Création manuelle
            </button>
          </div>
        </div>

        <input
          type="search"
          placeholder="Rechercher un plat…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-green-deep/20 bg-white px-4 py-2.5 text-sm text-charcoal placeholder-gray-warm focus:border-green-mid focus:outline-none"
        />

        <ul className="space-y-3">
          {filtered.map((fiche) => (
            <li key={fiche.id}>
              <Link
                href={`/fiches-techniques/${fiche.id}`}
                className="flex items-center justify-between rounded-xl border border-green-deep/10 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-display font-bold text-green-deep">{fiche.name}</p>
                    <p className="text-sm text-gray-warm">
                      {fiche.ingredientCount} ingrédients · Coût matière {fiche.costMatiere}
                    </p>
                  </div>
                  {fiche.hasAlert && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-warn/15 px-2 py-0.5 text-xs font-semibold text-orange-warn">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Ingrédient absent
                    </span>
                  )}
                </div>
                <span className="text-gray-warm">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
