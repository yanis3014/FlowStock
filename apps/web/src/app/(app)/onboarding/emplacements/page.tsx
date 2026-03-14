'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { EmplacementChip } from '@/components/onboarding/EmplacementChip';
import type { Emplacement, CuisineType, OnboardingProgressData } from '@/types/onboarding';

const SUGGESTIONS: Record<CuisineType, Pick<Emplacement, 'nom' | 'type'>[]> = {
  'Française':       [{ nom: 'Chambre froide', type: 'froid' }, { nom: 'Réserve sèche', type: 'sec' }, { nom: 'Cave', type: 'cave' }, { nom: 'Cuisine', type: 'cuisine' }],
  'Brasserie':       [{ nom: 'Chambre froide', type: 'froid' }, { nom: 'Cave/Bar', type: 'cave' }, { nom: 'Réserve sèche', type: 'sec' }, { nom: 'Cuisine', type: 'cuisine' }],
  'Italienne':       [{ nom: 'Chambre froide', type: 'froid' }, { nom: 'Réserve sèche', type: 'sec' }, { nom: 'Cave', type: 'cave' }, { nom: 'Cuisine', type: 'cuisine' }],
  'Pizzeria':        [{ nom: 'Chambre froide', type: 'froid' }, { nom: 'Réserve sèche', type: 'sec' }, { nom: 'Cuisine', type: 'cuisine' }],
  'Japonaise':       [{ nom: 'Chambre froide', type: 'froid' }, { nom: 'Réserve sèche', type: 'sec' }, { nom: 'Cuisine', type: 'cuisine' }],
  'Méditerranéenne': [{ nom: 'Chambre froide', type: 'froid' }, { nom: 'Réserve sèche', type: 'sec' }, { nom: 'Cave', type: 'cave' }, { nom: 'Cuisine', type: 'cuisine' }],
  'Autre':           [{ nom: 'Chambre froide', type: 'froid' }, { nom: 'Réserve sèche', type: 'sec' }, { nom: 'Cuisine', type: 'cuisine' }],
};

export default function EmplacementsPage() {
  const { fetchApi } = useApi();
  const router = useRouter();
  const [emplacements, setEmplacements] = useState<Emplacement[]>([]);
  const [prevData, setPrevData] = useState<OnboardingProgressData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApi('/onboarding/progress')
      .then((r) => r.json())
      .then((res: { success: boolean; data?: { onboarding_data: OnboardingProgressData | null } }) => {
        const data = res?.data?.onboarding_data;
        setPrevData(data ?? null);
        const cuisine = data?.profil?.type_cuisine ?? 'Autre';
        const suggestions = SUGGESTIONS[cuisine as CuisineType] ?? SUGGESTIONS['Autre'];
        setEmplacements(suggestions.map((s) => ({ ...s, id: crypto.randomUUID() })));
      })
      .catch(() => {
        setEmplacements(SUGGESTIONS['Autre'].map((s) => ({ ...s, id: crypto.randomUUID() })));
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addEmplacement = () => {
    setEmplacements((prev) => [...prev, { id: crypto.randomUUID(), nom: 'Nouvel emplacement', type: 'autre' }]);
  };

  const handleContinue = async () => {
    setError('');
    if (emplacements.length === 0) {
      setError('Au moins un emplacement est requis.');
      return;
    }
    setSaving(true);
    try {
      const results = await Promise.allSettled(
        emplacements.map((e) =>
          fetchApi('/locations', {
            method: 'POST',
            body: JSON.stringify({ name: e.nom, location_type: e.type }),
          })
        )
      );
      const hardErrors = results.filter((r) =>
        r.status === 'rejected' ||
        (r.status === 'fulfilled' && !r.value.ok && r.value.status !== 409)
      );
      if (hardErrors.length > 0) {
        setError('Erreur lors de la sauvegarde. Réessayez.');
        return;
      }
      const prev = prevData ?? { completed_steps: [], current_step: 'emplacements' as const };
      const completed = prev.completed_steps ?? [];
      await fetchApi('/onboarding/progress', {
        method: 'PATCH',
        body: JSON.stringify({
          onboarding: {
            ...prev,
            emplacements_count: emplacements.length,
            completed_steps: completed.includes('emplacements') ? completed : [...completed, 'emplacements'],
            current_step: 'stocks',
          },
        }),
      });
      router.push('/onboarding/stocks');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Emplacements de stockage</h1>
        <p className="text-charcoal/60 mt-1 text-sm">
          Définissez où sont stockés vos produits. Nous avons pré-rempli des suggestions selon votre type de cuisine.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {emplacements.map((emp) => (
          <EmplacementChip
            key={emp.id}
            emp={emp}
            onUpdate={(e) => setEmplacements((prev) => prev.map((x) => x.id === e.id ? e : x))}
            onDelete={() => setEmplacements((prev) => prev.filter((x) => x.id !== emp.id))}
          />
        ))}
        <button
          type="button"
          onClick={addEmplacement}
          className="bg-charcoal/8 border border-dashed border-charcoal/20 rounded-lg px-3 py-2 text-sm text-charcoal/50 hover:border-charcoal/40 transition-colors min-h-[44px]"
        >
          + Ajouter un emplacement
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-alert bg-red-alert/10 rounded-lg px-4 py-2">{error}</p>
      )}

      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={() => router.push('/onboarding/menu')}
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
