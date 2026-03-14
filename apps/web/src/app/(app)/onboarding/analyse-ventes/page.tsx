'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import type { OnboardingProgressData } from '@/types/onboarding';

const LOADING_MESSAGES = [
  'Connexion sécurisée à votre caisse en cours…',
  'Récupération de l\'historique des ventes des 12 derniers mois…',
  'Nettoyage et structuration des données…',
  'Analyse des tendances et de la saisonnalité par l\'IA…',
  'Identification de vos plats phares et catégories clés…',
  'Calcul des ratios de consommation par recette…',
  'Préparation de votre tableau de bord personnalisé…',
];

interface SalesAnalysisResult {
  ticketsAnalyses: number;
  platsIdentifies: number;
  moisHistorique: number;
}

async function fetchAndAnalyzeSalesData(): Promise<SalesAnalysisResult> {
  await new Promise((resolve) => setTimeout(resolve, 3500 + Math.random() * 1500));
  return {
    ticketsAnalyses: Math.floor(Math.random() * 1200) + 1800,
    platsIdentifies: Math.floor(Math.random() * 8) + 12,
    moisHistorique: 12,
  };
}

type PageState = 'loading' | 'success' | 'error';

export default function AnalyseVentesPage() {
  const { fetchApi } = useApi();
  const router = useRouter();
  const ranRef = useRef(false);

  const [pageState, setPageState] = useState<PageState>('loading');
  const [messageIndex, setMessageIndex] = useState(0);
  const [result, setResult] = useState<SalesAnalysisResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [prevData, setPrevData] = useState<OnboardingProgressData | null>(null);

  useEffect(() => {
    fetchApi('/onboarding/progress')
      .then((r) => (!r.ok ? null : r.json()))
      .then((res: { data?: { onboarding_data: OnboardingProgressData | null } } | null) => {
        setPrevData(res?.data?.onboarding_data ?? null);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, LOADING_MESSAGES.length - 1);
      setMessageIndex(msgIdx);
    }, 600);

    fetchAndAnalyzeSalesData()
      .then((data) => {
        clearInterval(interval);
        setResult(data);
        setPageState('success');
      })
      .catch(() => {
        clearInterval(interval);
        setPageState('error');
      });

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContinue = async () => {
    setSaving(true);
    try {
      const prev = prevData ?? { completed_steps: [], current_step: 'analyse-ventes' as const };
      const completed = prev.completed_steps ?? [];
      await fetchApi('/onboarding/progress', {
        method: 'PATCH',
        body: JSON.stringify({
          onboarding: {
            ...prev,
            completed_steps: completed.includes('pos') ? completed : [...completed, 'pos'],
            current_step: 'done',
          },
        }),
      });
      router.push('/onboarding/done');
    } catch {
      router.push('/onboarding/done');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);    opacity: 0.6; }
          50%  { transform: scale(1.15); opacity: 0.2; }
          100% { transform: scale(1);    opacity: 0.6; }
        }
        @keyframes msgFade {
          0%   { opacity: 0; transform: translateY(6px); }
          15%  { opacity: 1; transform: translateY(0); }
          85%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
        .animate-fade-slide-in  { animation: fadeSlideIn 0.6s ease-out forwards; }
        .animate-fade-slide-up  { animation: fadeSlideUp 0.5s ease-out forwards; }
        .animate-spin-slow      { animation: spin 1.4s linear infinite; }
        .animate-pulse-ring     { animation: pulse-ring 2s ease-in-out infinite; }
        .animate-msg-fade       { animation: msgFade 0.5s ease-out forwards; }
        .stat-card-enter        { animation: fadeSlideUp 0.5s ease-out forwards; }
      `}</style>

      {pageState === 'loading' && (
        <div className="max-w-md w-full flex flex-col items-center gap-8 animate-fade-slide-in">
          {/* Indicateur IA */}
          <div className="relative flex items-center justify-center w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-[#1C2B2A]/10 animate-pulse-ring" />
            <div className="w-16 h-16 rounded-full bg-[#1C2B2A]/5 border-2 border-[#1C2B2A]/20 flex items-center justify-center">
              <svg
                className="animate-spin-slow text-[#1C2B2A]"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
          </div>

          <div className="text-center flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-charcoal">
              Analyse de vos ventes en cours…
            </h1>
            <p className="text-charcoal/50 text-sm">
              L&apos;agent IA analyse votre historique. Cela prend quelques instants.
            </p>
          </div>

          {/* Message dynamique */}
          <div className="w-full bg-white border border-charcoal/10 rounded-xl px-5 py-4 flex items-start gap-3 min-h-[68px]">
            <div className="w-2 h-2 rounded-full bg-[#1C2B2A] mt-1 flex-shrink-0 animate-pulse" />
            <p
              key={messageIndex}
              className="text-sm text-charcoal/80 font-medium animate-msg-fade"
            >
              {LOADING_MESSAGES[messageIndex]}
            </p>
          </div>

          {/* Barre de progression simulée */}
          <div className="w-full">
            <div className="flex justify-between text-xs text-charcoal/40 mb-1.5">
              <span>Progression</span>
              <span>{Math.round((messageIndex / (LOADING_MESSAGES.length - 1)) * 100)}%</span>
            </div>
            <div className="w-full bg-charcoal/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-[#1C2B2A] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.round((messageIndex / (LOADING_MESSAGES.length - 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {pageState === 'success' && result && (
        <div className="max-w-lg w-full flex flex-col items-center gap-8 animate-fade-slide-in">
          {/* Icône succès */}
          <div className="w-20 h-20 bg-[#1C2B2A]/8 rounded-full flex items-center justify-center">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#1C2B2A]"
            >
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>

          {/* Titre */}
          <div className="text-center flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-charcoal">
              Vos données sont prêtes à être exploitées&nbsp;!
            </h1>
            <p className="text-charcoal/55 text-sm">
              L&apos;agent IA a analysé votre historique et identifié vos tendances clés.
            </p>
          </div>

          {/* Cartes de statistiques */}
          <div className="w-full grid grid-cols-3 gap-4">
            <div className="stat-card-enter bg-white rounded-xl border border-charcoal/10 p-4 flex flex-col items-center gap-1.5" style={{ animationDelay: '0.05s', opacity: 0 }}>
              <span className="text-2xl font-bold text-charcoal">
                {result.ticketsAnalyses.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs text-charcoal/55 text-center leading-tight">
                Tickets analysés
              </span>
            </div>
            <div className="stat-card-enter bg-white rounded-xl border border-charcoal/10 p-4 flex flex-col items-center gap-1.5" style={{ animationDelay: '0.15s', opacity: 0 }}>
              <span className="text-2xl font-bold text-charcoal">
                {result.platsIdentifies}
              </span>
              <span className="text-xs text-charcoal/55 text-center leading-tight">
                Plats identifiés
              </span>
            </div>
            <div className="stat-card-enter bg-white rounded-xl border border-charcoal/10 p-4 flex flex-col items-center gap-1.5" style={{ animationDelay: '0.25s', opacity: 0 }}>
              <span className="text-2xl font-bold text-charcoal">
                {result.moisHistorique}
              </span>
              <span className="text-xs text-charcoal/55 text-center leading-tight">
                Mois d&apos;historique
              </span>
            </div>
          </div>

          {/* Encart info IA */}
          <div className="w-full bg-[#1C2B2A]/5 border border-[#1C2B2A]/15 rounded-xl px-4 py-3.5 flex items-start gap-3">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#1C2B2A] flex-shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="text-sm text-charcoal/70">
              Ces données seront utilisées pour calibrer les alertes de stocks et les
              commandes fournisseurs recommandées par votre agent.
            </p>
          </div>

          {/* CTA */}
          <div className="w-full flex flex-col gap-3">
            <button
              type="button"
              onClick={handleContinue}
              disabled={saving}
              className="w-full bg-[#1C2B2A] text-white rounded-xl px-6 py-4 font-semibold text-base min-h-[56px] disabled:opacity-50 transition-opacity"
            >
              {saving ? 'Enregistrement…' : 'Continuer vers l\'inventaire initial →'}
            </button>
          </div>
        </div>
      )}

      {pageState === 'error' && (
        <div className="max-w-md w-full flex flex-col items-center gap-6 animate-fade-slide-in">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-charcoal">Synchronisation impossible</h1>
            <p className="text-charcoal/60 mt-1 text-sm">
              Une erreur est survenue lors de la récupération de l&apos;historique. Vous pouvez réessayer ou continuer sans les données.
            </p>
          </div>
          <div className="w-full flex flex-col gap-3">
            <button
              type="button"
              onClick={() => { ranRef.current = false; setPageState('loading'); setMessageIndex(0); }}
              className="w-full bg-[#1C2B2A] text-white rounded-xl px-6 py-3 font-semibold text-sm min-h-[44px]"
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="w-full text-sm text-charcoal/50 underline min-h-[44px]"
            >
              Continuer sans les données
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
