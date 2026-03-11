'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { Check, CreditCard, X } from 'lucide-react';
import { TIER_LABELS, type SubscriptionTier } from '@/lib/subscriptions';

const PLAN_FEATURES: Record<SubscriptionTier, string[]> = {
  normal: ['Jusqu\'à 50 ingrédients', 'Mode Rush', 'Stocks de base'],
  premium: ['Ingrédients illimités', 'Suggestions IA illimitées', 'Export CSV', 'Support prioritaire'],
  premium_plus: ['Tout Growth', 'Photo factures', 'Commandes auto', 'Historique 365 jours'],
};

const PLAN_PRICES: Record<SubscriptionTier, number> = {
  normal: 29,
  premium: 89,
  premium_plus: 149,
};

const PLANS: SubscriptionTier[] = ['normal', 'premium', 'premium_plus'];

const MOCK_PAIEMENTS = [
  { id: '1', date: '1er fév. 2025', montant: 29, statut: 'Payé' },
  { id: '2', date: '1er janv. 2025', montant: 0, statut: 'Essai gratuit' },
];

export default function AbonnementPage() {
  const { token, isLoading } = useAuth();
  const { fetchApi } = useApi();
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('normal');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<SubscriptionTier | null>(null);
  const [modalResiliation, setModalResiliation] = useState(false);
  const [raisonDepart, setRaisonDepart] = useState('');

  const loadSubscription = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchApi('/subscriptions/current');
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json?.data) {
          setCurrentTier(json.data.tier);
          setTrialEndsAt(json.data.trial_ends_at ?? null);
        }
      }
    } catch {
      // Garder les valeurs par défaut
    } finally {
      setLoading(false);
    }
  }, [token, fetchApi]);

  const handleUpgrade = useCallback(
    async (newTier: SubscriptionTier) => {
      if (!token || newTier === currentTier) return;
      setUpgrading(newTier);
      try {
        const res = await fetchApi('/subscriptions/upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_tier: newTier }),
        });
        if (res.ok) {
          setCurrentTier(newTier);
        }
      } catch {
        // Erreur silencieuse ou toast
      } finally {
        setUpgrading(null);
      }
    },
    [token, currentTier, fetchApi]
  );

  useEffect(() => {
    if (token) loadSubscription();
  }, [token, loadSubscription]);

  const joursEssaiRestants = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-2xl space-y-8 p-4 pb-24 md:pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-green-deep">Abonnement & Facturation</h1>
          <p className="text-sm text-gray-warm">Votre plan et vos paiements</p>
        </div>

        {/* Plan actuel + Jours d'essai */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Plan actuel</h2>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="font-display text-2xl font-bold text-charcoal">
                {loading ? '…' : TIER_LABELS[currentTier]}
              </p>
              <p className="text-sm text-gray-warm">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(PLAN_PRICES[currentTier])}
                /mois
              </p>
            </div>
            {joursEssaiRestants > 0 && (
              <span className="rounded-full bg-green-mid/20 px-3 py-1 text-sm font-semibold text-green-deep">
                {joursEssaiRestants} jours d&apos;essai restants
              </span>
            )}
          </div>
        </section>

        {/* Comparatif plans */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Changer de plan</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLANS.map((tier) => {
              const isCurrent = currentTier === tier;
              const label = TIER_LABELS[tier];
              const prix = PLAN_PRICES[tier];
              const features = PLAN_FEATURES[tier];
              return (
                <div
                  key={tier}
                  className={`rounded-xl border-2 p-5 ${
                    isCurrent ? 'border-green-mid bg-green-mid/5' : 'border-green-deep/10 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-display text-lg font-bold text-green-deep">{label}</p>
                    {isCurrent && (
                      <span className="rounded-full bg-green-mid/20 px-2 py-0.5 text-xs font-semibold text-green-deep">
                        Actuel
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-display text-2xl font-bold text-charcoal">
                    {prix === 0 ? 'Gratuit' : `${prix} €/mois`}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-charcoal">
                        <Check className="h-4 w-4 shrink-0 text-green-mid" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleUpgrade(tier)}
                      disabled={!!upgrading}
                      className="mt-4 w-full rounded-xl bg-green-mid py-2.5 font-display text-sm font-bold text-white hover:bg-green-deep disabled:opacity-50"
                    >
                      {upgrading === tier ? 'En cours…' : `Passer au plan ${label}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Zone Paiement (UI type Stripe) */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Moyen de paiement</h2>
          <p className="mt-1 text-sm text-gray-warm">Géré de manière sécurisée (mock — pas d’appel Stripe réel)</p>
          <div className="mt-4 rounded-lg border border-dashed border-green-deep/20 bg-cream/30 p-6 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-gray-warm" />
            <p className="mt-2 text-sm font-medium text-charcoal">Carte enregistrée ·••• 4242</p>
            <button
              type="button"
              className="mt-3 text-sm font-medium text-green-mid hover:underline"
            >
              Modifier la carte
            </button>
          </div>
        </section>

        {/* Historique paiements */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Historique des paiements</h2>
          <ul className="mt-4 space-y-3">
            {MOCK_PAIEMENTS.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-green-deep/10 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-charcoal">{p.date}</p>
                  <p className="text-xs text-gray-warm">{p.statut}</p>
                </div>
                <span className="font-display font-bold text-green-deep">
                  {p.montant === 0 ? '—' : `${p.montant} €`}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Résiliation */}
        <section className="rounded-xl border border-red-alert/20 bg-red-alert/5 p-6">
          <h2 className="font-display text-lg font-bold text-charcoal">Résilier l&apos;abonnement</h2>
          <p className="mt-1 text-sm text-gray-warm">
            Votre accès restera actif jusqu&apos;à la fin de la période en cours.
          </p>
          <button
            type="button"
            onClick={() => setModalResiliation(true)}
            className="mt-4 text-sm font-medium text-red-alert hover:underline"
          >
            Demander la résiliation
          </button>
        </section>
      </div>

      {/* Modal Pourquoi partez-vous ? */}
      {modalResiliation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-green-deep/10 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-green-deep">Pourquoi partez-vous ?</h3>
              <button
                type="button"
                onClick={() => setModalResiliation(false)}
                className="rounded p-2 text-gray-warm hover:bg-gray-100"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-warm">
              Votre avis nous aide à nous améliorer (optionnel).
            </p>
            <textarea
              value={raisonDepart}
              onChange={(e) => setRaisonDepart(e.target.value)}
              placeholder="Ex. trop cher, pas assez utilisé…"
              rows={3}
              className="mt-3 w-full rounded-lg border border-green-deep/20 px-4 py-2 text-sm focus:border-green-mid focus:outline-none"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setModalResiliation(false)}
                className="flex-1 rounded-xl border border-green-deep/20 py-2.5 font-display text-sm font-bold text-green-deep"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalResiliation(false);
                  setRaisonDepart('');
                }}
                className="flex-1 rounded-xl bg-red-alert py-2.5 font-display text-sm font-bold text-white"
              >
                Confirmer la résiliation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
