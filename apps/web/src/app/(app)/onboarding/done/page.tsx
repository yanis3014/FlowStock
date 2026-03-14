'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import type { OnboardingApiResponse } from '@/types/onboarding';

interface Summary {
  plats: number;
  produits: number;
  alertes: number;
}

export default function DonePage() {
  const { fetchApi } = useApi();
  const router = useRouter();
  const completedRef = useRef(false);
  const [summary, setSummary] = useState<Summary>({ plats: 0, produits: 0, alertes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    // Vérifier si déjà complété (protection contre refresh)
    fetchApi('/onboarding/progress')
      .then((r) => r.json())
      .then((data: { success: boolean; data?: OnboardingApiResponse }) => {
        if (!data?.data?.onboarding_completed) {
          const typeCuisine = data?.data?.onboarding_data?.profil?.type_cuisine;
          fetchApi('/onboarding/complete', {
            method: 'POST',
            body: JSON.stringify({ type_cuisine: typeCuisine }),
          }).catch(() => {});
        }
      })
      .catch(() => {});

    // Charger résumé en parallèle
    Promise.all([
      fetchApi('/recipes?limit=100').then((r) => r.json()),
      fetchApi('/products?limit=1').then((r) => r.json()),
      fetchApi('/products?status=low').then((r) => r.json()),
    ])
      .then(([recipesRes, productsRes, lowRes]) => {
        setSummary({
          plats: recipesRes?.pagination?.total ?? 0,
          produits: productsRes?.pagination?.total ?? 0,
          alertes: lowRes?.pagination?.total ?? 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-slide-in {
          animation: fadeSlideIn 0.5s ease-out forwards;
        }
      `}</style>

      <div className="max-w-lg w-full flex flex-col items-center gap-8 fade-slide-in">
        {/* Icône succès */}
        <div className="w-16 h-16 bg-green-bright/15 rounded-full flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-bright">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-charcoal">Votre restaurant est prêt !</h1>
          <p className="text-charcoal/60 mt-2">
            Configuration terminée — votre dashboard est opérationnel.
          </p>
        </div>

        {/* Résumé */}
        {!loading && (
          <div className="w-full grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-charcoal/10 p-4 flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-charcoal">{summary.plats}</span>
              <span className="text-xs text-charcoal/60 text-center">Fiches techniques</span>
            </div>
            <div className="bg-white rounded-xl border border-charcoal/10 p-4 flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-charcoal">{summary.produits}</span>
              <span className="text-xs text-charcoal/60 text-center">Produits en stock</span>
            </div>
            <div className={`rounded-xl border p-4 flex flex-col items-center gap-1 ${summary.alertes > 0 ? 'bg-orange-warn/10 border-orange-warn/20' : 'bg-white border-charcoal/10'}`}>
              <span className={`text-2xl font-bold ${summary.alertes > 0 ? 'text-orange-warn' : 'text-charcoal'}`}>{summary.alertes}</span>
              <span className="text-xs text-charcoal/60 text-center">Alertes stocks</span>
            </div>
          </div>
        )}

        {/* Alerte stocks bas */}
        {summary.alertes > 0 && (
          <div className="w-full bg-orange-warn/15 border border-orange-warn/30 rounded-xl px-4 py-3 flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-warn flex-shrink-0 mt-0.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-sm text-orange-warn font-medium">
              {summary.alertes} produit{summary.alertes > 1 ? 's' : ''} sous le seuil minimum — à commander dès aujourd&apos;hui
            </p>
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="w-full bg-[#1C2B2A] text-white rounded-xl px-6 py-4 font-semibold text-base min-h-[56px]"
        >
          Voir mon dashboard →
        </button>
      </div>
    </div>
  );
}
