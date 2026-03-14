'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { extractMenuWithAI } from './actions';
import { MenuCard } from '@/components/onboarding/MenuCard';
import type { MenuPlatLocal, OnboardingProgressData } from '@/types/onboarding';

type MenuStep = 'IDLE' | 'EXTRACTING' | 'REVIEW' | 'SAVING' | 'EMPTY';

export default function MenuPage() {
  const { fetchApi } = useApi();
  const router = useRouter();
  const [step, setStep] = useState<MenuStep>('IDLE');
  const [plats, setPlats] = useState<MenuPlatLocal[]>([]);
  const [typeCuisine, setTypeCuisine] = useState('Française');
  const [prevData, setPrevData] = useState<OnboardingProgressData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApi('/onboarding/progress')
      .then((r) => r.json())
      .then((res: { success: boolean; data?: { onboarding_data: OnboardingProgressData | null } }) => {
        const data = res?.data?.onboarding_data;
        setPrevData(data ?? null);
        if (data?.profil?.type_cuisine) {
          setTypeCuisine(data.profil.type_cuisine);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelected = async (_file: File, dataUrl: string) => {
    setError('');
    setStep('EXTRACTING');
    try {
      // Passer la dataUrl complète à la Server Action (comme menu-scan)
      const result = await extractMenuWithAI(dataUrl, typeCuisine);

      if (!result.success) {
        setError(result.error);
        setStep('IDLE');
        return;
      }

      if (result.data.plats.length === 0) {
        setStep('EMPTY');
        return;
      }

      setPlats(result.data.plats.map((p) => ({ ...p, id: crypto.randomUUID() })));
      setStep('REVIEW');
    } catch {
      setError("Erreur lors de l'extraction. Réessayez.");
      setStep('IDLE');
    }
  };

  const handleSkip = async () => {
    const prev = prevData ?? { completed_steps: [], current_step: 'menu' as const };
    const completed = prev.completed_steps ?? [];
    await fetchApi('/onboarding/progress', {
      method: 'PATCH',
      body: JSON.stringify({
        onboarding: {
          ...prev,
          menu_skipped: true,
          completed_steps: completed.includes('menu') ? completed : [...completed, 'menu'],
          current_step: 'emplacements',
        },
      }),
    });
    router.push('/onboarding/emplacements');
  };

  const handleSave = async () => {
    setStep('SAVING');
    const results = await Promise.allSettled(
      plats.map((plat) =>
        fetchApi('/recipes', {
          method: 'POST',
          body: JSON.stringify({
            name: plat.nom,
            category: plat.categorie,
            source: 'scan_ia',
            confidence: plat.confiance,
            ingredients: plat.ingredients.map((ing, i) => ({
              ingredient_name: ing.nom,
              quantity: ing.quantite,
              unit: ing.unite,
              sort_order: i,
            })),
          }),
        })
      )
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(`${plats.length - failed}/${plats.length} plats sauvegardés.`);
    }
    const prev = prevData ?? { completed_steps: [], current_step: 'menu' as const };
    const completed = prev.completed_steps ?? [];
    await fetchApi('/onboarding/progress', {
      method: 'PATCH',
      body: JSON.stringify({
        onboarding: {
          ...prev,
          menu_extracted: true,
          completed_steps: completed.includes('menu') ? completed : [...completed, 'menu'],
          current_step: 'emplacements',
        },
      }),
    });
    router.push('/onboarding/emplacements');
  };

  const addPlat = () => {
    setPlats((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nom: 'Nouveau plat',
        categorie: 'Plats',
        ingredients: [],
        confiance: 'low' as const,
      },
    ]);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Votre menu</h1>
        <p className="text-charcoal/60 mt-1 text-sm">
          Photographiez votre menu — l&apos;IA extrait automatiquement vos plats et ingrédients.
        </p>
      </div>

      {step === 'IDLE' && (
        <div className="flex flex-col gap-4">
          <FileUploadZoneWrapper onFileSelected={handleFileSelected} />
          {error && (
            <p className="text-sm text-red-alert bg-red-alert/10 rounded-lg px-4 py-2">{error}</p>
          )}
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-charcoal/50 underline text-center"
          >
            Passer et saisir manuellement
          </button>
        </div>
      )}

      {step === 'EXTRACTING' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-charcoal/60 text-center animate-pulse">
            Analyse de votre menu en cours…
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-charcoal/8 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {step === 'EMPTY' && (
        <div className="bg-orange-warn/10 border border-orange-warn/30 rounded-xl p-6 flex flex-col gap-3">
          <p className="font-medium text-charcoal">Aucun plat détecté dans l&apos;image</p>
          <p className="text-sm text-charcoal/60">
            L&apos;image n&apos;a pas permis d&apos;identifier des plats. Essayez une autre photo plus nette,
            ou saisissez vos plats manuellement.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setStep('IDLE')}
              className="text-sm bg-[#1C2B2A] text-white px-4 py-2 rounded-lg min-h-[44px]"
            >
              Réessayer avec une autre photo
            </button>
            <button
              type="button"
              onClick={() => { setPlats([]); setStep('REVIEW'); }}
              className="text-sm text-charcoal/60 underline"
            >
              Saisir manuellement
            </button>
          </div>
        </div>
      )}

      {(step === 'REVIEW' || step === 'SAVING') && (
        <div className="flex flex-col gap-4">
          {plats.length === 0 && (
            <p className="text-sm text-charcoal/50 italic">
              Aucun plat pour l&apos;instant — ajoutez-en avec le bouton ci-dessous.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plats.map((plat) => (
              <MenuCard
                key={plat.id}
                plat={plat}
                onUpdate={(p) => setPlats((prev) => prev.map((x) => x.id === p.id ? p : x))}
                onDelete={() => setPlats((prev) => prev.filter((x) => x.id !== plat.id))}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addPlat}
            className="text-sm text-green-deep underline text-left"
          >
            + Ajouter un plat
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={step === 'SAVING'}
            className="bg-[#1C2B2A] text-white px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 min-h-[44px] self-end"
          >
            {step === 'SAVING' ? 'Enregistrement…' : 'Valider et continuer →'}
          </button>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={() => router.push('/onboarding/profil')}
          className="text-sm text-charcoal/60 hover:text-charcoal min-h-[44px] px-2"
        >
          ← Précédent
        </button>
        {(step === 'IDLE' || step === 'EMPTY') && (
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-charcoal/40 underline"
          >
            Passer cette étape
          </button>
        )}
      </div>
    </div>
  );
}

function FileUploadZoneWrapper({ onFileSelected }: { onFileSelected: (file: File, content: string) => void }) {
  const [dragOver, setDragOver] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onFileSelected(file, reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onFileSelected(file, reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <label
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors ${
        dragOver ? 'border-[#1C2B2A] bg-[#1C2B2A]/5' : 'border-charcoal/20 hover:border-charcoal/40'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-charcoal/30">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <div className="text-center">
        <p className="font-medium text-charcoal">Déposez une photo de votre menu</p>
        <p className="text-sm text-charcoal/50 mt-1">JPG, PNG — max 15 Mo</p>
      </div>
      <input
        type="file"
        accept=".jpg,.jpeg,.png"
        className="hidden"
        onChange={handleChange}
      />
    </label>
  );
}
