'use client';

import { useState } from 'react';
import Link from 'next/link';

type Sante = 'actif' | 'risque_churn' | 'inactif';

interface ClientRow {
  id: string;
  nom: string;
  ville: string;
  plan: string;
  dateInscription: string;
  mrr: number;
  derniereConnexion: string;
  sante: Sante;
}

const MOCK_CLIENTS: ClientRow[] = [
  { id: '1', nom: 'Le Comptoir', ville: 'Paris', plan: 'Pro', dateInscription: '15 janv. 2025', mrr: 89, derniereConnexion: 'Il y a 2h', sante: 'actif' },
  { id: '2', nom: 'La Terrasse', ville: 'Lyon', plan: 'Pro', dateInscription: '22 janv. 2025', mrr: 89, derniereConnexion: 'Il y a 1j', sante: 'actif' },
  { id: '3', nom: 'Chez Marie', ville: 'Bordeaux', plan: 'Starter', dateInscription: '10 fév. 2025', mrr: 29, derniereConnexion: 'Il y a 5j', sante: 'risque_churn' },
  { id: '4', nom: 'Le Bistrot', ville: 'Marseille', plan: 'Pro', dateInscription: '05 déc. 2024', mrr: 89, derniereConnexion: 'Il y a 14j', sante: 'inactif' },
  { id: '5', nom: 'La Table', ville: 'Toulouse', plan: 'Starter', dateInscription: '28 fév. 2025', mrr: 29, derniereConnexion: 'Il y a 30 min', sante: 'actif' },
];

const SANTE_LABELS: Record<Sante, string> = {
  actif: 'Actif',
  risque_churn: 'Risque churn',
  inactif: 'Inactif',
};

const SANTE_CLASSES: Record<Sante, string> = {
  actif: 'bg-green-mid/20 text-green-deep',
  risque_churn: 'bg-orange-warn/20 text-orange-warn',
  inactif: 'bg-gray-warm/20 text-gray-warm',
};

export default function AdminClientsPage() {
  const [search, setSearch] = useState('');
  const [filterSante, setFilterSante] = useState<Sante | ''>('');

  const filtered = MOCK_CLIENTS.filter((c) => {
    const matchSearch =
      !search.trim() ||
      c.nom.toLowerCase().includes(search.trim().toLowerCase()) ||
      c.ville.toLowerCase().includes(search.trim().toLowerCase());
    const matchSante = !filterSante || c.sante === filterSante;
    return matchSearch && matchSante;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-green-deep">Liste des clients</h2>
        <p className="text-sm text-gray-warm">Données mock · Back-office fondateur</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Rechercher (nom, ville…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-green-mid focus:outline-none"
        />
        <div className="flex gap-2">
          <span className="text-sm text-gray-warm">Santé :</span>
          {(['actif', 'risque_churn', 'inactif'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterSante(filterSante === s ? '' : s)}
              className={`rounded-lg px-3 py-1 text-sm font-medium ${
                filterSante === s ? SANTE_CLASSES[s] : 'bg-gray-100 text-gray-warm hover:bg-gray-200'
              }`}
            >
              {SANTE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 font-display font-bold text-green-deep">Client</th>
              <th className="px-4 py-3 font-display font-bold text-green-deep">Ville</th>
              <th className="px-4 py-3 font-display font-bold text-green-deep">Plan</th>
              <th className="px-4 py-3 font-display font-bold text-green-deep">Inscription</th>
              <th className="px-4 py-3 font-display font-bold text-green-deep">MRR</th>
              <th className="px-4 py-3 font-display font-bold text-green-deep">Dernière connexion</th>
              <th className="px-4 py-3 font-display font-bold text-green-deep">Santé</th>
              <th className="px-4 py-3" aria-label="Action" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-cream/30">
                <td className="px-4 py-3 font-medium text-charcoal">{c.nom}</td>
                <td className="px-4 py-3 text-gray-warm">{c.ville}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-green-deep/10 px-2 py-0.5 font-medium text-green-deep">
                    {c.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-warm">{c.dateInscription}</td>
                <td className="px-4 py-3 font-display font-bold text-green-deep">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(c.mrr)}
                </td>
                <td className="px-4 py-3 text-gray-warm">{c.derniereConnexion}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SANTE_CLASSES[c.sante]}`}>
                    {SANTE_LABELS[c.sante]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/clients/${c.id}`}
                    className="font-medium text-green-mid hover:underline"
                  >
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
