'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Check, X, RefreshCw, AlertTriangle, Lock, Sparkles } from 'lucide-react';

const MOCK_PLAT_DU_JOUR = {
  nom: 'Tartare de saumon + Risotto canard',
  economie: '~65 €',
  raison:
    'Votre saumon arrive à DLC demain. Le proposer en tartare en entrée et associer le risotto au canard permet d\'écouler les deux produits sans gaspillage.',
};

const MOCK_INGREDIENTS_A_ECOULER = [
  { id: '1', name: 'Saumon atlantique', dlc: 'Demain', portions: 12 },
  { id: '2', name: 'Magret de canard', dlc: 'J+2', portions: 8 },
  { id: '3', name: 'Crème fraîche', dlc: 'Demain', portions: 6 },
];

const MOCK_HISTORIQUE = [
  { id: '1', plat: 'Burger maison', date: '24 fév.', statut: 'accepté' as const },
  { id: '2', plat: 'Salade César', date: '23 fév.', statut: 'refusé' as const },
  { id: '3', plat: 'Dos de saumon', date: '22 fév.', statut: 'accepté' as const },
];

const MOCK_ALERTE_GASPILLAGE = {
  message: '3 ingrédients avec DLC < 48h — validez un plat du jour pour réduire le gaspillage.',
  count: 3,
};

const IS_STARTER = true; // Mock : version Starter = bloc verrouillé

export default function SuggestionsPage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const [validated, setValidated] = useState(false);
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    if (!token && !isLoading) router.push('/login?returnUrl=/suggestions');
  }, [token, isLoading, router]);

  if (!token && isLoading) return null;
  if (!token) return null;

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-2xl space-y-6 p-4 pb-24 md:pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-green-deep">Suggestions IA</h1>
          <p className="text-sm text-gray-warm">Plat du jour et écoulement des produits à DLC courte</p>
        </div>

        {/* Alerte gaspillage */}
        <div className="flex items-start gap-3 rounded-xl border border-orange-warn/30 bg-orange-warn/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-orange-warn" />
          <div>
            <p className="font-medium text-charcoal">{MOCK_ALERTE_GASPILLAGE.message}</p>
            <p className="mt-1 text-sm text-gray-warm">
              {MOCK_ALERTE_GASPILLAGE.count} produit(s) concerné(s)
            </p>
          </div>
        </div>

        {/* Carte Plat du jour recommandé */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-mid" />
            <h2 className="font-display text-lg font-bold text-green-deep">Plat du jour recommandé</h2>
          </div>
          {validated ? (
            <div className="rounded-lg bg-green-mid/10 p-4 text-center">
              <Check className="mx-auto h-8 w-8 text-green-mid" />
              <p className="mt-2 font-display font-bold text-green-deep">Plat du jour validé</p>
              <p className="text-sm text-gray-warm">Mise à jour affichée en caisse et sur l’ardoise.</p>
            </div>
          ) : refused ? (
            <div className="rounded-lg bg-gray-warm/10 p-4 text-center">
              <p className="font-display font-bold text-charcoal">Une autre suggestion sera proposée demain.</p>
              <p className="text-sm text-gray-warm">Pensez à vérifier vos stocks à DLC courte.</p>
            </div>
          ) : (
            <>
              <p className="font-display text-xl font-bold text-charcoal">{MOCK_PLAT_DU_JOUR.nom}</p>
              <p className="mt-2 text-sm text-gray-warm">{MOCK_PLAT_DU_JOUR.raison}</p>
              <p className="mt-2 text-sm font-semibold text-green-deep">
                Économie estimée : {MOCK_PLAT_DU_JOUR.economie}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setValidated(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-mid py-2.5 font-display text-sm font-bold text-white"
                >
                  <Check className="h-4 w-4" />
                  Valider ce plat du jour
                </button>
                <button
                  type="button"
                  onClick={() => setRefused(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-green-deep/30 px-4 py-2.5 font-display text-sm font-bold text-green-deep"
                >
                  <RefreshCw className="h-4 w-4" />
                  Autre option
                </button>
              </div>
            </>
          )}
        </section>

        {/* Ingrédients à écouler (DLC < 48h) */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">À écouler en priorité (DLC &lt; 48h)</h2>
          <ul className="mt-3 space-y-2">
            {MOCK_INGREDIENTS_A_ECOULER.map((ing) => (
              <li
                key={ing.id}
                className="flex items-center justify-between rounded-lg border border-green-deep/10 bg-cream/30 px-4 py-3"
              >
                <span className="font-medium text-charcoal">{ing.name}</span>
                <div className="text-right text-sm">
                  <span className="text-gray-warm">DLC {ing.dlc}</span>
                  <span className="ml-2 font-display font-bold text-green-deep">{ing.portions} portions</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Historique acceptées / refusées */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Historique des suggestions</h2>
          <ul className="mt-3 space-y-2">
            {MOCK_HISTORIQUE.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-green-deep/10 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-charcoal">{h.plat}</p>
                  <p className="text-xs text-gray-warm">{h.date}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    h.statut === 'accepté' ? 'bg-green-mid/20 text-green-deep' : 'bg-gray-warm/20 text-gray-warm'
                  }`}
                >
                  {h.statut === 'accepté' ? 'Accepté' : 'Refusé'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Version Starter : bloc verrouillé + CTA upgrade Pro */}
        {IS_STARTER && (
          <section className="rounded-xl border-2 border-dashed border-green-deep/20 bg-cream p-6 text-center">
            <Lock className="mx-auto h-8 w-8 text-gray-warm" />
            <h3 className="mt-2 font-display font-bold text-green-deep">Suggestions illimitées avec Pro</h3>
            <p className="mt-1 text-sm text-gray-warm">
              Passez en Pro pour débloquer les suggestions quotidiennes et l’historique complet.
            </p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-green-mid px-6 py-2.5 font-display text-sm font-bold text-white"
            >
              Passer en Pro
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
