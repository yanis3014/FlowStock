'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuggestions } from '@/hooks/useSuggestions';
import { Check, RefreshCw, AlertTriangle, Lock, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function SuggestionsPage() {
  useAuth();
  const { suggestions, loading, error, refetch } = useSuggestions();
  const [validated, setValidated] = useState(false);
  const [refused, setRefused] = useState(false);

  const topSuggestion = suggestions[0];
  const alertCount = suggestions.length;

  if (loading) {
    return (
      <div className="p-6 bg-cream min-h-screen">
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-cream font-body">
      <div className="mx-auto max-w-2xl space-y-6 p-6 pb-24 md:pb-6">
        <PageHeader title="Suggestions IA" subtitle="Réapprovisionnements et produits à surveiller" />

        {error && (
          <div className="rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
            {error}
          </div>
        )}

        {/* Alerte stocks à réapprovisionner */}
        {alertCount > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/10 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-gold" />
            <div>
              <p className="font-medium text-charcoal">
                {alertCount} produit{alertCount > 1 ? 's' : ''} sous le seuil d&apos;alerte — réapprovisionnez pour éviter les ruptures.
              </p>
              <p className="mt-1 text-sm text-charcoal/50">{alertCount} suggestion{alertCount > 1 ? 's' : ''} disponible{alertCount > 1 ? 's' : ''}</p>
            </div>
          </div>
        )}

        {/* Carte suggestion prioritaire (dérivée du premier produit à stock bas) */}
        <section className="rounded-xl border border-charcoal/8 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-deep" />
            <h2 className="font-display text-lg font-bold text-charcoal">Suggestion prioritaire</h2>
          </div>
          {suggestions.length === 0 ? (
            <div className="rounded-lg bg-green-deep/8 p-6 text-center">
              <Check className="mx-auto h-8 w-8 text-green-deep" />
              <p className="mt-2 font-display font-bold text-charcoal">Tout est sous contrôle</p>
              <p className="mt-1 text-sm text-charcoal/50">Aucun produit sous le seuil d&apos;alerte pour le moment.</p>
            </div>
          ) : validated ? (
            <div className="rounded-lg bg-green-deep/8 p-4 text-center">
              <Check className="mx-auto h-8 w-8 text-green-deep" />
              <p className="mt-2 font-display font-bold text-charcoal">Suggestion prise en compte</p>
              <p className="text-sm text-charcoal/50">Pensez à passer commande auprès de vos fournisseurs.</p>
            </div>
          ) : refused ? (
            <div className="rounded-lg bg-gray-warm/10 p-4 text-center">
              <p className="font-display font-bold text-charcoal">Une autre suggestion sera proposée.</p>
              <p className="text-sm text-charcoal/50">Vérifiez vos stocks régulièrement.</p>
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
              <p className="mt-2 text-sm text-charcoal/50">{topSuggestion.description}</p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setValidated(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-deep py-2.5 font-display text-sm font-bold text-cream hover:bg-forest-green transition-colors"
                >
                  <Check className="h-4 w-4" />
                  J&apos;ai commandé
                </button>
                <button
                  type="button"
                  onClick={() => setRefused(true)}
                  className="inline-flex items-center justify-center gap-2 border border-charcoal/20 text-charcoal px-4 py-2 rounded-lg text-sm font-medium hover:bg-charcoal/5 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Plus tard
                </button>
              </div>
            </>
          ) : null}
        </section>

        {/* Liste des produits à réapprovisionner */}
        <section className="rounded-xl border border-charcoal/8 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-charcoal">À réapprovisionner</h2>
          {suggestions.length === 0 ? (
            <p className="mt-3 text-sm text-charcoal/50">Aucun produit sous le seuil d&apos;alerte.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {suggestions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-charcoal/8 bg-cream/30 px-4 py-3"
                >
                  <span className="font-medium text-charcoal">{s.productName ?? s.title}</span>
                  <div className="text-right text-sm">
                    <span className="text-charcoal/50">
                      {s.currentQty ?? '—'} / {s.threshold ?? '—'} {s.unit ?? ''}
                    </span>
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        s.priority === 'high' ? 'bg-terracotta/10 text-terracotta' : 'bg-gold/15 text-gold'
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
        <section className="rounded-xl border border-charcoal/8 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-charcoal">Historique des suggestions</h2>
          <p className="mt-3 text-sm text-charcoal/50">L&apos;historique sera disponible avec l&apos;API suggestions.</p>
        </section>

        {/* Version Starter : bloc verrouillé + CTA upgrade Pro */}
        <section className="rounded-xl border-2 border-dashed border-charcoal/15 bg-cream p-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-charcoal/50" />
          <h3 className="mt-2 font-display font-bold text-charcoal">Suggestions illimitées avec Pro</h3>
          <p className="mt-1 text-sm text-charcoal/50">
            Passez en Pro pour débloquer les suggestions quotidiennes et l&apos;historique complet.
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-green-deep hover:bg-forest-green transition-colors px-6 py-2.5 font-display text-sm font-bold text-cream"
          >
            Passer en Pro
          </button>
        </section>
      </div>
    </div>
  );
}
