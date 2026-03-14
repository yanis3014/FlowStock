'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { PosCard } from '@/components/onboarding/PosCard';
import type { OnboardingProgressData } from '@/types/onboarding';

const POS_LIST = [
  { name: 'Lightspeed', description: 'Caisse connectée', href: '/parametres' },
  { name: "L'Addition", description: 'Logiciel de caisse', href: '/parametres' },
  { name: 'Square', description: 'POS mobile', href: '/parametres' },
  { name: 'Autre / Manuel', description: 'Configuration manuelle', href: '/parametres' },
];

export default function PosPage() {
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
      const prev = prevData ?? { completed_steps: [], current_step: 'pos' as const };
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Connexion à votre logiciel de caisse</h1>
        <p className="text-charcoal/60 mt-1 text-sm">
          Connectez votre POS pour synchroniser automatiquement vos ventes et ajuster vos stocks en temps réel.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {POS_LIST.map((pos) => (
          <PosCard key={pos.name} {...pos} />
        ))}
      </div>

      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={() => router.push('/onboarding/fournisseurs')}
          className="text-sm text-charcoal/60 hover:text-charcoal min-h-[44px] px-2"
        >
          ← Précédent
        </button>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving}
            className="bg-[#1C2B2A] text-white px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 min-h-[44px]"
          >
            {saving ? 'Enregistrement…' : 'Continuer →'}
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="text-sm text-charcoal/50 underline"
          >
            Passer cette étape
          </button>
        </div>
      </div>
    </div>
  );
}
