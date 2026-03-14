'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import type { ProfilRestaurant, CuisineType, JourSemaine, OnboardingProgressData } from '@/types/onboarding';

const CUISINE_TYPES: CuisineType[] = [
  'Française', 'Italienne', 'Japonaise', 'Méditerranéenne', 'Pizzeria', 'Brasserie', 'Autre',
];

const JOURS: { code: JourSemaine; label: string }[] = [
  { code: 'lun', label: 'Lun' },
  { code: 'mar', label: 'Mar' },
  { code: 'mer', label: 'Mer' },
  { code: 'jeu', label: 'Jeu' },
  { code: 'ven', label: 'Ven' },
  { code: 'sam', label: 'Sam' },
  { code: 'dim', label: 'Dim' },
];

const DEFAULT_PROFIL: ProfilRestaurant = {
  nom: '',
  type_cuisine: 'Française',
  nb_couverts: 50,
  service_midi: true,
  service_soir: true,
  jours_fermeture: [],
};

export default function ProfilPage() {
  const { fetchApi } = useApi();
  const router = useRouter();
  const [profil, setProfil] = useState<ProfilRestaurant>(DEFAULT_PROFIL);
  const [prevData, setPrevData] = useState<OnboardingProgressData | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    fetchApi('/onboarding/progress')
      .then((r) => r.json())
      .then((res: { success: boolean; data?: { onboarding_data: OnboardingProgressData | null } }) => {
        const data = res?.data?.onboarding_data;
        setPrevData(data ?? null);
        if (data?.profil) {
          setProfil(data.profil);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isValid = profil.nom.trim().length > 0 && (profil.service_midi || profil.service_soir);

  const toggleJour = (code: JourSemaine) => {
    setProfil((p) => ({
      ...p,
      jours_fermeture: p.jours_fermeture.includes(code)
        ? p.jours_fermeture.filter((j) => j !== code)
        : [...p.jours_fermeture, code],
    }));
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (!isValid) return;
    setSaving(true);
    try {
      const prev = prevData ?? { completed_steps: [], current_step: 'profil' as const };
      const completed = prev.completed_steps ?? [];
      await fetchApi('/onboarding/progress', {
        method: 'PATCH',
        body: JSON.stringify({
          onboarding: {
            ...prev,
            profil,
            completed_steps: completed.includes('profil') ? completed : [...completed, 'profil'],
            current_step: 'menu',
          },
        }),
      });
      router.push('/onboarding/menu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Votre restaurant</h1>
        <p className="text-charcoal/60 mt-1 text-sm">Commençons par les informations de base.</p>
      </div>

      {/* Section Restaurant */}
      <div className="bg-white rounded-xl border border-charcoal/10 p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-charcoal">Restaurant</h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-charcoal/70">Nom du restaurant *</label>
          <input
            className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C2B2A]/20 ${
              touched && !profil.nom.trim() ? 'border-red-alert' : 'border-charcoal/20'
            }`}
            value={profil.nom}
            onChange={(e) => setProfil((p) => ({ ...p, nom: e.target.value }))}
            placeholder="Le Bistrot de Paul"
          />
          {touched && !profil.nom.trim() && (
            <p className="text-xs text-red-alert">Nom du restaurant requis</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-charcoal/70">Type de cuisine</label>
          <select
            className="border border-charcoal/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C2B2A]/20 bg-white"
            value={profil.type_cuisine}
            onChange={(e) => setProfil((p) => ({ ...p, type_cuisine: e.target.value as CuisineType }))}
          >
            {CUISINE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Section Services */}
      <div className="bg-white rounded-xl border border-charcoal/10 p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-charcoal">Services</h2>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-charcoal/70">
            Nombre de couverts : <span className="font-semibold text-charcoal">{profil.nb_couverts}</span>
          </label>
          <input
            type="range"
            min={10}
            max={300}
            step={10}
            value={profil.nb_couverts}
            onChange={(e) => setProfil((p) => ({ ...p, nb_couverts: parseInt(e.target.value) }))}
            className="w-full accent-[#1C2B2A]"
          />
          <div className="flex justify-between text-xs text-charcoal/40">
            <span>10</span><span>300</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              role="switch"
              aria-checked={profil.service_midi}
              onClick={() => setProfil((p) => ({ ...p, service_midi: !p.service_midi }))}
              className={`relative w-10 h-6 rounded-full transition-colors ${profil.service_midi ? 'bg-[#1C2B2A]' : 'bg-charcoal/20'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${profil.service_midi ? 'translate-x-4' : ''}`} />
            </button>
            <span className="text-sm text-charcoal">Service du midi</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              role="switch"
              aria-checked={profil.service_soir}
              onClick={() => setProfil((p) => ({ ...p, service_soir: !p.service_soir }))}
              className={`relative w-10 h-6 rounded-full transition-colors ${profil.service_soir ? 'bg-[#1C2B2A]' : 'bg-charcoal/20'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${profil.service_soir ? 'translate-x-4' : ''}`} />
            </button>
            <span className="text-sm text-charcoal">Service du soir</span>
          </label>
          {touched && !profil.service_midi && !profil.service_soir && (
            <p className="text-xs text-red-alert">Sélectionnez au moins un service</p>
          )}
        </div>
      </div>

      {/* Section Fermeture */}
      <div className="bg-white rounded-xl border border-charcoal/10 p-5 flex flex-col gap-3">
        <h2 className="font-semibold text-charcoal">Jours de fermeture</h2>
        <div className="flex flex-wrap gap-2">
          {JOURS.map(({ code, label }) => {
            const selected = profil.jours_fermeture.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggleJour(code)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-w-[44px] min-h-[44px] ${
                  selected
                    ? 'bg-[#1C2B2A] text-white'
                    : 'bg-charcoal/8 text-charcoal/60 border border-charcoal/15'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end pb-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="bg-[#1C2B2A] text-white px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 min-h-[44px]"
        >
          {saving ? 'Enregistrement…' : 'Continuer →'}
        </button>
      </div>
    </div>
  );
}
