'use client';

import { useState } from 'react';
import Link from 'next/link';

type StatutFeedback = 'nouveau' | 'lu' | 'traite';
type StatutTicket = 'ouvert' | 'en_cours' | 'resolu' | 'ferme';

interface FeedbackRow {
  id: string;
  client: string;
  clientId: string;
  date: string;
  type: string;
  message: string;
  tags: string[];
  statut: StatutFeedback;
}

interface TicketRow {
  id: string;
  client: string;
  clientId: string;
  sujet: string;
  date: string;
  statut: StatutTicket;
}

const MOCK_FEEDBACKS: FeedbackRow[] = [
  {
    id: '1',
    client: 'Le Comptoir',
    clientId: '1',
    date: '24 fév. 2025',
    type: 'Suggestion',
    message: 'Export CSV hebdomadaire serait très utile pour notre compta.',
    tags: ['export', 'compta'],
    statut: 'traite',
  },
  {
    id: '2',
    client: 'Chez Marie',
    clientId: '3',
    date: '23 fév. 2025',
    type: 'Bug',
    message: 'Les alertes Rush ne se rafraîchissent pas après un ajustement.',
    tags: ['rush', 'bug'],
    statut: 'nouveau',
  },
  {
    id: '3',
    client: 'La Table',
    clientId: '5',
    date: '22 fév. 2025',
    type: 'Amélioration',
    message: 'Possibilité de dupliquer une fiche technique en un clic.',
    tags: ['fiches techniques'],
    statut: 'lu',
  },
];

const MOCK_TICKETS: TicketRow[] = [
  { id: 'T1', client: 'Le Bistrot', clientId: '4', sujet: 'Problème connexion Lightspeed', date: '25 fév. 2025', statut: 'en_cours' },
  { id: 'T2', client: 'Chez Marie', clientId: '3', sujet: 'Demande formation Mode Rush', date: '20 fév. 2025', statut: 'resolu' },
  { id: 'T3', client: 'La Terrasse', clientId: '2', sujet: 'Facturation — changement d\'adresse', date: '18 fév. 2025', statut: 'ferme' },
];

const STATUT_FB_LABELS: Record<StatutFeedback, string> = {
  nouveau: 'Nouveau',
  lu: 'Lu',
  traite: 'Traité',
};

const STATUT_FB_CLASSES: Record<StatutFeedback, string> = {
  nouveau: 'bg-orange-warn/20 text-orange-warn',
  lu: 'bg-blue-500/20 text-blue-600',
  traite: 'bg-green-mid/20 text-green-deep',
};

const STATUT_TICKET_LABELS: Record<StatutTicket, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  resolu: 'Résolu',
  ferme: 'Fermé',
};

const STATUT_TICKET_CLASSES: Record<StatutTicket, string> = {
  ouvert: 'bg-orange-warn/20 text-orange-warn',
  en_cours: 'bg-blue-500/20 text-blue-600',
  resolu: 'bg-green-mid/20 text-green-deep',
  ferme: 'bg-gray-warm/20 text-gray-warm',
};

export default function AdminFeedbackPage() {
  const [filterStatutFb, setFilterStatutFb] = useState<StatutFeedback | 'all'>('all');
  const [filterStatutTicket, setFilterStatutTicket] = useState<StatutTicket | 'all'>('all');

  const feedbacksFiltered =
    filterStatutFb === 'all'
      ? MOCK_FEEDBACKS
      : MOCK_FEEDBACKS.filter((f) => f.statut === filterStatutFb);

  const ticketsFiltered =
    filterStatutTicket === 'all'
      ? MOCK_TICKETS
      : MOCK_TICKETS.filter((t) => t.statut === filterStatutTicket);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-green-deep">Feedback & Support</h2>
        <p className="text-sm text-gray-warm">Feedbacks utilisateurs et tickets support · Données mock</p>
      </div>

      {/* Liste feedbacks */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-display text-lg font-bold text-green-deep">Feedbacks</h3>
          <div className="flex gap-2">
            {(['all', 'nouveau', 'lu', 'traite'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatutFb(s)}
                className={`rounded-lg px-3 py-1 text-sm font-medium ${
                  filterStatutFb === s ? 'bg-green-mid/20 text-green-deep' : 'bg-gray-100 text-gray-warm hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'Tous' : STATUT_FB_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <ul className="space-y-4">
          {feedbacksFiltered.map((f) => (
            <li
              key={f.id}
              className="rounded-lg border border-gray-100 p-4 hover:bg-gray-50"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/clients/${f.clientId}`}
                      className="font-medium text-green-mid hover:underline"
                    >
                      {f.client}
                    </Link>
                    <span className="text-xs text-gray-warm">{f.date}</span>
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium text-charcoal bg-gray-100">
                      {f.type}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-charcoal">{f.message}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {f.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-green-deep/10 px-2 py-0.5 text-xs text-green-deep"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUT_FB_CLASSES[f.statut]}`}>
                  {STATUT_FB_LABELS[f.statut]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Liste tickets support */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-display text-lg font-bold text-green-deep">Tickets support</h3>
          <div className="flex gap-2">
            {(['all', 'ouvert', 'en_cours', 'resolu', 'ferme'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatutTicket(s)}
                className={`rounded-lg px-3 py-1 text-sm font-medium ${
                  filterStatutTicket === s ? 'bg-green-mid/20 text-green-deep' : 'bg-gray-100 text-gray-warm hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'Tous' : STATUT_TICKET_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-warm">
                <th className="pb-3 font-display font-bold text-green-deep">Ticket</th>
                <th className="pb-3 font-display font-bold text-green-deep">Client</th>
                <th className="pb-3 font-display font-bold text-green-deep">Sujet</th>
                <th className="pb-3 font-display font-bold text-green-deep">Date</th>
                <th className="pb-3 font-display font-bold text-green-deep">Statut</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {ticketsFiltered.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 font-mono font-medium text-charcoal">{t.id}</td>
                  <td className="py-3">
                    <Link href={`/admin/clients/${t.clientId}`} className="text-green-mid hover:underline">
                      {t.client}
                    </Link>
                  </td>
                  <td className="py-3 text-charcoal">{t.sujet}</td>
                  <td className="py-3 text-gray-warm">{t.date}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUT_TICKET_CLASSES[t.statut]}`}>
                      {STATUT_TICKET_LABELS[t.statut]}
                    </span>
                  </td>
                  <td className="py-3">
                    <button type="button" className="text-green-mid hover:underline">
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
