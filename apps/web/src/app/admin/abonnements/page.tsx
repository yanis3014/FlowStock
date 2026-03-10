'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

interface AboRow {
  id: string;
  client: string;
  plan: string;
  statut: 'actif' | 'essai' | 'annule';
  mrr: number;
  prochaineEcheance: string;
}

const MOCK_ABONNEMENTS: AboRow[] = [
  { id: '1', client: 'Le Comptoir', plan: 'Pro', statut: 'actif', mrr: 89, prochaineEcheance: '1 mars 2025' },
  { id: '2', client: 'La Terrasse', plan: 'Pro', statut: 'actif', mrr: 89, prochaineEcheance: '22 mars 2025' },
  { id: '3', client: 'Chez Marie', plan: 'Starter', statut: 'essai', mrr: 0, prochaineEcheance: '10 mars 2025' },
  { id: '4', client: 'Le Bistrot', plan: 'Pro', statut: 'actif', mrr: 89, prochaineEcheance: '5 mars 2025' },
  { id: '5', client: 'La Table', plan: 'Starter', statut: 'essai', mrr: 0, prochaineEcheance: '28 mars 2025' },
];

const MOCK_ECHECS = [
  { id: '1', client: 'Restaurant Les Arcades', montant: 89, date: '24 fév. 2025', statut: 'relance envoyée' },
];

const MOCK_MRR_PAR_PLAN = [
  { plan: 'Starter', count: 2, mrr: 58 },
  { plan: 'Pro', count: 3, mrr: 267 },
];

const MOCK_MOUVEMENTS = [
  { date: '25 fév.', libelle: 'Nouvel abonnement Pro — La Table (à l’issue de l’essai)', montant: 89 },
  { date: '24 fév.', libelle: 'Échec paiement — Les Arcades', montant: -89 },
  { date: '22 fév.', libelle: 'Renouvellement — La Terrasse', montant: 89 },
  { date: '15 fév.', libelle: 'Churn — Auberge du Pont', montant: -29 },
];

const STATUT_LABELS: Record<string, string> = {
  actif: 'Actif',
  essai: 'Essai',
  annule: 'Annulé',
};

const STATUT_CLASSES: Record<string, string> = {
  actif: 'bg-green-mid/20 text-green-deep',
  essai: 'bg-orange-warn/20 text-orange-warn',
  annule: 'bg-gray-warm/20 text-gray-warm',
};

export default function AdminAbonnementsPage() {
  const [filterPlan, setFilterPlan] = useState<string>('all');

  const filtered =
    filterPlan === 'all'
      ? MOCK_ABONNEMENTS
      : MOCK_ABONNEMENTS.filter((a) => a.plan.toLowerCase() === filterPlan);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-green-deep">Abonnements & Revenus</h2>
        <p className="text-sm text-gray-warm">Liste des abonnements, échecs et mouvements · Données mock</p>
      </div>

      {/* Liens Stripe (UI) */}
      <div className="flex flex-wrap gap-4">
        <a
          href="#"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-green-deep hover:bg-gray-50"
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir Stripe Dashboard
        </a>
        <a
          href="#"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-green-deep hover:bg-gray-50"
        >
          <ExternalLink className="h-4 w-4" />
          Clients Stripe
        </a>
      </div>

      {/* MRR par plan */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="font-display text-lg font-bold text-green-deep">MRR par plan</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {MOCK_MRR_PAR_PLAN.map((row) => (
            <div
              key={row.plan}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4"
            >
              <span className="font-medium text-charcoal">{row.plan}</span>
              <div className="text-right">
                <p className="font-display font-bold text-green-deep">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(row.mrr)}
                </p>
                <p className="text-xs text-gray-warm">{row.count} client(s)</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Liste abonnements */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-green-deep">Liste des abonnements</h3>
          <div className="flex gap-2">
            {['all', 'Starter', 'Pro'].map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => setFilterPlan(plan === 'all' ? 'all' : plan.toLowerCase())}
                className={`rounded-lg px-3 py-1 text-sm font-medium ${
                  filterPlan === (plan === 'all' ? 'all' : plan.toLowerCase())
                    ? 'bg-green-mid/20 text-green-deep'
                    : 'bg-gray-100 text-gray-warm hover:bg-gray-200'
                }`}
              >
                {plan === 'all' ? 'Tous' : plan}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-warm">
                <th className="pb-3 font-display font-bold text-green-deep">Client</th>
                <th className="pb-3 font-display font-bold text-green-deep">Plan</th>
                <th className="pb-3 font-display font-bold text-green-deep">Statut</th>
                <th className="pb-3 font-display font-bold text-green-deep">MRR</th>
                <th className="pb-3 font-display font-bold text-green-deep">Prochaine échéance</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 font-medium text-charcoal">{a.client}</td>
                  <td className="py-3">{a.plan}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUT_CLASSES[a.statut]}`}>
                      {STATUT_LABELS[a.statut]}
                    </span>
                  </td>
                  <td className="py-3 font-display font-bold text-green-deep">
                    {a.mrr === 0 ? '—' : `${a.mrr} €`}
                  </td>
                  <td className="py-3 text-gray-warm">{a.prochaineEcheance}</td>
                  <td className="py-3">
                    <Link href={`/admin/clients/${a.id}`} className="text-green-mid hover:underline">
                      Voir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Échecs paiement */}
      <section className="rounded-xl border border-red-alert/20 bg-red-alert/5 p-6">
        <h3 className="font-display text-lg font-bold text-green-deep">Échecs de paiement</h3>
        {MOCK_ECHECS.length === 0 ? (
          <p className="mt-4 text-sm text-gray-warm">Aucun échec récent.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {MOCK_ECHECS.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-lg border border-red-alert/20 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-charcoal">{e.client}</p>
                  <p className="text-xs text-gray-warm">{e.date} · {e.statut}</p>
                </div>
                <span className="font-display font-bold text-red-alert">-{e.montant} €</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Mouvements du mois */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="font-display text-lg font-bold text-green-deep">Mouvements du mois</h3>
        <ul className="mt-4 space-y-2">
          {MOCK_MOUVEMENTS.map((m, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-charcoal">{m.libelle}</p>
                <p className="text-xs text-gray-warm">{m.date}</p>
              </div>
              <span
                className={`font-display font-bold ${
                  m.montant >= 0 ? 'text-green-deep' : 'text-red-alert'
                }`}
              >
                {m.montant >= 0 ? '+' : ''}{m.montant} €
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
