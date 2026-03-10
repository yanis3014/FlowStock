'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/** Feedbacks et tickets par client (complément Sprint 5). */
const MOCK_FEEDBACKS_PAR_CLIENT: Record<string, { date: string; type: string; message: string; statut: string }[]> = {
  '1': [{ date: '24 fév. 2025', type: 'Suggestion', message: 'Export CSV hebdomadaire pour la compta.', statut: 'Traité' }],
  '3': [{ date: '23 fév. 2025', type: 'Bug', message: 'Alertes Rush ne se rafraîchissent pas après ajustement.', statut: 'Nouveau' }],
  '5': [{ date: '22 fév. 2025', type: 'Amélioration', message: 'Dupliquer une fiche technique en un clic.', statut: 'Lu' }],
};

const MOCK_TICKETS_PAR_CLIENT: Record<string, { id: string; sujet: string; date: string; statut: string }[]> = {
  '2': [{ id: 'T3', sujet: 'Facturation — changement d\'adresse', date: '18 fév. 2025', statut: 'Fermé' }],
  '3': [{ id: 'T2', sujet: 'Demande formation Mode Rush', date: '20 fév. 2025', statut: 'Résolu' }],
  '4': [{ id: 'T1', sujet: 'Problème connexion Lightspeed', date: '25 fév. 2025', statut: 'En cours' }],
};

const MOCK_CLIENTS: Record<
  string,
  {
    nom: string;
    ville: string;
    plan: string;
    email: string;
    dateInscription: string;
    pos: { connecte: boolean; type: string };
    engagement: { connexions7j: number; rushLances: number };
    dernierPaiement: string;
    mrr: number;
    notes: string;
  }
> = {
  '1': {
    nom: 'Le Comptoir',
    ville: 'Paris',
    plan: 'Pro',
    email: 'contact@lecomptoir.fr',
    dateInscription: '15 janvier 2025',
    pos: { connecte: true, type: 'Lightspeed' },
    engagement: { connexions7j: 12, rushLances: 28 },
    dernierPaiement: '1er février 2025',
    mrr: 89,
    notes: 'Client très actif. Demande export CSV hebdo — à prévoir en Pro.',
  },
  '2': {
    nom: 'La Terrasse',
    ville: 'Lyon',
    plan: 'Pro',
    email: 'accueil@laterrasse.fr',
    dateInscription: '22 janvier 2025',
    pos: { connecte: true, type: 'Lightspeed' },
    engagement: { connexions7j: 8, rushLances: 18 },
    dernierPaiement: '22 janvier 2025',
    mrr: 89,
    notes: '',
  },
  '3': {
    nom: 'Chez Marie',
    ville: 'Bordeaux',
    plan: 'Starter',
    email: 'marie@chezmarie.fr',
    dateInscription: '10 février 2025',
    pos: { connecte: false, type: 'Saisie manuelle' },
    engagement: { connexions7j: 2, rushLances: 3 },
    dernierPaiement: '10 février 2025',
    mrr: 29,
    notes: 'Peu d’usage depuis 1 semaine — relance email prévue.',
  },
  '4': {
    nom: 'Le Bistrot',
    ville: 'Marseille',
    plan: 'Pro',
    email: 'bistrot@lebistrot.fr',
    dateInscription: '5 décembre 2024',
    pos: { connecte: true, type: 'Lightspeed' },
    engagement: { connexions7j: 0, rushLances: 0 },
    dernierPaiement: '5 janvier 2025',
    mrr: 89,
    notes: 'Aucune connexion depuis 14j. Churn probable — relance en cours.',
  },
  '5': {
    nom: 'La Table',
    ville: 'Toulouse',
    plan: 'Starter',
    email: 'contact@latable.fr',
    dateInscription: '28 février 2025',
    pos: { connecte: false, type: 'Saisie manuelle' },
    engagement: { connexions7j: 5, rushLances: 7 },
    dernierPaiement: '28 février 2025',
    mrr: 29,
    notes: '',
  },
};

export default function AdminClientProfilPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const client = id ? MOCK_CLIENTS[id] : null;
  const feedbacks = id ? MOCK_FEEDBACKS_PAR_CLIENT[id] ?? [] : [];
  const tickets = id ? MOCK_TICKETS_PAR_CLIENT[id] ?? [] : [];

  if (!client) {
    return (
      <div className="space-y-4">
        <Link href="/admin/clients" className="inline-flex items-center gap-1 text-sm text-green-mid hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Retour aux clients
        </Link>
        <p className="text-gray-warm">Client non trouvé.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1 text-sm font-medium text-green-mid hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Liste des clients
        </Link>
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold text-green-deep">{client.nom}</h2>
        <p className="text-sm text-gray-warm">Profil client · Données mock</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Infos générales */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-lg font-bold text-green-deep">Informations</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-gray-warm">Email</dt>
              <dd className="font-medium text-charcoal">{client.email}</dd>
            </div>
            <div>
              <dt className="text-gray-warm">Ville</dt>
              <dd className="font-medium text-charcoal">{client.ville}</dd>
            </div>
            <div>
              <dt className="text-gray-warm">Plan</dt>
              <dd>
                <span className="rounded-full bg-green-deep/10 px-2 py-0.5 font-medium text-green-deep">
                  {client.plan}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-gray-warm">Inscription</dt>
              <dd className="font-medium text-charcoal">{client.dateInscription}</dd>
            </div>
          </dl>
        </section>

        {/* Statut POS */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-lg font-bold text-green-deep">Caisse / POS</h3>
          <div className="mt-4 flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                client.pos.connecte ? 'bg-green-mid' : 'bg-gray-warm'
              }`}
            />
            <span className="font-medium text-charcoal">
              {client.pos.connecte ? 'Connecté' : 'Non connecté'} — {client.pos.type}
            </span>
          </div>
        </section>

        {/* Indicateurs d'engagement */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-lg font-bold text-green-deep">Engagement (7 derniers jours)</h3>
          <div className="mt-4 flex gap-6">
            <div>
              <p className="text-2xl font-display font-bold text-green-deep">{client.engagement.connexions7j}</p>
              <p className="text-xs text-gray-warm">Connexions</p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-green-deep">{client.engagement.rushLances}</p>
              <p className="text-xs text-gray-warm">Mode Rush lancés</p>
            </div>
          </div>
        </section>

        {/* Historique paiements */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-lg font-bold text-green-deep">Facturation</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-gray-warm">MRR</dt>
              <dd className="font-display font-bold text-green-deep">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(client.mrr)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-warm">Dernier paiement</dt>
              <dd className="font-medium text-charcoal">{client.dernierPaiement}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-gray-warm">Historique complet (mock) — lien Stripe en production</p>
        </section>
      </div>

      {/* Notes internes */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="font-display text-lg font-bold text-green-deep">Notes internes</h3>
        <p className="mt-4 text-sm text-charcoal">
          {client.notes || 'Aucune note.'}
        </p>
      </section>

      {/* Complément Sprint 5 : Feedbacks et tickets du client */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-green-deep">Feedbacks</h3>
            <Link href="/admin/feedback" className="text-sm text-green-mid hover:underline">
              Voir tout
            </Link>
          </div>
          {feedbacks.length === 0 ? (
            <p className="mt-4 text-sm text-gray-warm">Aucun feedback.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {feedbacks.map((fb, i) => (
                <li key={i} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs text-gray-warm">{fb.date} · {fb.type}</p>
                  <p className="mt-1 text-sm text-charcoal">{fb.message}</p>
                  <span className="mt-2 inline-block rounded-full bg-green-deep/10 px-2 py-0.5 text-xs font-medium text-green-deep">
                    {fb.statut}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-green-deep">Tickets support</h3>
            <Link href="/admin/feedback" className="text-sm text-green-mid hover:underline">
              Voir tout
            </Link>
          </div>
          {tickets.length === 0 ? (
            <p className="mt-4 text-sm text-gray-warm">Aucun ticket.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {tickets.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="font-medium text-charcoal">{t.sujet}</p>
                    <p className="text-xs text-gray-warm">{t.date} · {t.statut}</p>
                  </div>
                  <span className="font-mono text-xs text-gray-warm">{t.id}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
