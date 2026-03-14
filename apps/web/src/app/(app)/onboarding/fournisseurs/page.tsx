'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import type { OnboardingProgressData } from '@/types/onboarding';

export default function FournisseursPage() {
  const { fetchApi } = useApi();
  const router = useRouter();
  const [prevData, setPrevData] = useState<OnboardingProgressData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchApi('/onboarding/progress')
      .then((r) => r.json())
      .then((res: { data?: { onboarding_data: OnboardingProgressData | null } }) => {
        setPrevData(res?.data?.onboarding_data ?? null);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContinue = async () => {
    setSaving(true);
    try {
      const prev = prevData ?? { completed_steps: [], current_step: 'fournisseurs' as const };
      const completed = prev.completed_steps ?? [];
      await fetchApi('/onboarding/progress', {
        method: 'PATCH',
        body: JSON.stringify({
          onboarding: {
            ...prev,
            completed_steps: completed.includes('fournisseurs') ? completed : [...completed, 'fournisseurs'],
            current_step: 'pos',
          },
        }),
      });
      router.push('/onboarding/pos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Vos fournisseurs</h1>
        <p className="text-charcoal/60 mt-1 text-sm">
          Gérez vos fournisseurs et délais de livraison.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-xl">
        {/* Formulaire désactivé */}
        <div className="pointer-events-none opacity-40 bg-white border border-charcoal/10 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-charcoal/70">Nom du fournisseur</label>
            <input disabled className="border border-charcoal/20 rounded-lg px-3 py-2 text-sm bg-charcoal/5" placeholder="Metro, Transgourmet…" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-sm text-charcoal/70">Téléphone</label>
              <input disabled className="border border-charcoal/20 rounded-lg px-3 py-2 text-sm bg-charcoal/5" placeholder="01 23 45 67 89" />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-sm text-charcoal/70">Email</label>
              <input disabled className="border border-charcoal/20 rounded-lg px-3 py-2 text-sm bg-charcoal/5" placeholder="contact@…" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-charcoal/70">Délai de livraison : <span className="font-semibold">3 jours</span></label>
            <input disabled type="range" min={1} max={14} defaultValue={3} className="w-full" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-charcoal/70">Jours de livraison</label>
            <div className="flex gap-2 flex-wrap">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].map((j) => (
                <span key={j} className="px-3 py-1 bg-charcoal/8 rounded-lg text-sm text-charcoal/50">{j}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Overlay "Bientôt disponible" */}
        <div className="absolute inset-0 bg-cream/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3 rounded-xl">
          <span className="bg-[#D4A843]/20 text-[#D4A843] text-xs font-semibold px-3 py-1.5 rounded">
            Bientôt disponible
          </span>
          <p className="text-sm text-charcoal/70 text-center px-6">
            La gestion complète des fournisseurs arrive prochainement.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={() => router.push('/onboarding/stocks')}
          className="text-sm text-charcoal/60 hover:text-charcoal min-h-[44px] px-2"
        >
          ← Précédent
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={saving}
          className="bg-[#1C2B2A] text-white px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 min-h-[44px]"
        >
          {saving ? 'Enregistrement…' : 'Continuer →'}
        </button>
      </div>
    </div>
  );
}
