'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuggestions } from '@/hooks/useSuggestions';
import { Check, RefreshCw, AlertTriangle, Lock, Sparkles, Loader2 } from 'lucide-react';

export default function SuggestionsPage() {
  useAuth();
  const { suggestions, loading, error, refetch } = useSuggestions();
  const [validated, setValidated] = useState(false);
  const [refused, setRefused] = useState(false);

  const topSuggestion = suggestions[0];
  const alertCount = suggestions.length;

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-cream">
        <Loader2 className="h-8 w-8 animate-spin text-green-mid" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-2xl space-y-6 p-4 pb-24 md:pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-green-deep">Suggestions IA</h1>
          <p className="text-sm text-gray-warm">Réapprovisionnements et produits à surveiller</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-alert/30 bg-red-alert/10 px-4 py-3 text-sm text-red-alert">
            {error}
          </div>
        )}

        {/* Alerte stocks à réapprovisionner */}
        {alertCount > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-orange-warn/30 bg-orange-warn/10 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-orange-warn" />
            <div>
              <p className="font-medium text-charcoal">
                {alertCount} produit{alertCount > 1 ? 's' : ''} sous le seuil d&apos;alerte — réapprovisionnez pour éviter les ruptures.
              </p>
              <p className="mt-1 text-sm text-gray-warm">{alertCount} suggestion{alertCount > 1 ? 's' : ''} disponible{alertCount > 1 ? 's' : ''}</p>
            </div>
          </div>
        )}

        {/* Carte suggestion prioritaire (dérivée du premier produit à stock bas) */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-mid" />
            <h2 className="font-display text-lg font-bold text-green-deep">Suggestion prioritaire</h2>
          </div>
          {suggestions.length === 0 ? (
            <div className="rounded-lg bg-green-mid/10 p-6 text-center">
              <Check className="mx-auto h-8 w-8 text-green-mid" />
              <p className="mt-2 font-display font-bold text-green-deep">Tout est sous contrôle</p>
              <p className="mt-1 text-sm text-gray-warm">Aucun produit sous le seuil d&apos;alerte pour le moment.</p>
            </div>
          ) : validated ? (
            <div className="rounded-lg bg-green-mid/10 p-4 text-center">
              <Check className="mx-auto h-8 w-8 text-green-mid" />
              <p className="mt-2 font-display font-bold text-green-deep">Suggestion prise en compte</p>
              <p className="text-sm text-gray-warm">Pensez à passer commande auprès de vos fournisseurs.</p>
            </div>
          ) : refused ? (
            <div className="rounded-lg bg-gray-warm/10 p-4 text-center">
              <p className="font-display font-bold text-charcoal">Une autre suggestion sera proposée.</p>
              <p className="text-sm text-gray-warm">Vérifiez vos stocks régulièrement.</p>
              <button
                type="button"
                onClick={() => setRefused(false)}
                className="mt-3 text-sm font-medium text-green-deep underline"
              >
                Voir à nouveau
              </button>
            </div>
          ) : topSuggestion ? (
            <>
              <p className="font-display text-xl font-bold text-charcoal">{topSuggestion.title}</p>
              <p className="mt-2 text-sm text-gray-warm">{topSuggestion.description}</p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setValidated(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-mid py-2.5 font-display text-sm font-bold text-white"
                >
                  <Check className="h-4 w-4" />
                  J&apos;ai commandé
                </button>
                <button
                  type="button"
                  onClick={() => setRefused(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-green-deep/30 px-4 py-2.5 font-display text-sm font-bold text-green-deep"
                >
                  <RefreshCw className="h-4 w-4" />
                  Plus tard
                </button>
              </div>
            </>
          ) : null}
        </section>

        {/* Liste des produits à réapprovisionner */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">À réapprovisionner</h2>
          {suggestions.length === 0 ? (
            <p className="mt-3 text-sm text-gray-warm">Aucun produit sous le seuil d&apos;alerte.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {suggestions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-green-deep/10 bg-cream/30 px-4 py-3"
                >
                  <span className="font-medium text-charcoal">{s.productName ?? s.title}</span>
                  <div className="text-right text-sm">
                    <span className="text-gray-warm">
                      {s.currentQty ?? '—'} / {s.threshold ?? '—'} {s.unit ?? ''}
                    </span>
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        s.priority === 'high' ? 'bg-red-alert/15 text-red-alert' : 'bg-orange-warn/15 text-orange-warn'
                      }`}
                    >
                      {s.priority === 'high' ? 'Priorité haute' : 'Priorité moyenne'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {suggestions.length > 0 && (
            <button
              type="button"
              onClick={refetch}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-green-deep"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
          )}
        </section>

        {/* Historique — vide pour l'instant (pas d'API) */}
        <section className="rounded-xl border border-green-deep/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-green-deep">Historique des suggestions</h2>
          <p className="mt-3 text-sm text-gray-warm">L&apos;historique sera disponible avec l&apos;API suggestions.</p>
        </section>

        {/* Version Starter : bloc verrouillé + CTA upgrade Pro */}
        <section className="rounded-xl border-2 border-dashed border-green-deep/20 bg-cream p-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-gray-warm" />
          <h3 className="mt-2 font-display font-bold text-green-deep">Suggestions illimitées avec Pro</h3>
          <p className="mt-1 text-sm text-gray-warm">
            Passez en Pro pour débloquer les suggestions quotidiennes et l&apos;historique complet.
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-green-mid px-6 py-2.5 font-display text-sm font-bold text-white"
          >
            Passer en Pro
          </button>
        </section>
      </div>
    </div>
  );
}
