'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, Upload, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { num: 1, label: 'Photo de carte' },
  { num: 2, label: 'Stocks initiaux' },
  { num: 3, label: 'Connexion caisse' },
  { num: 4, label: "C'est parti" },
];

const STORAGE_KEY = 'flowstock_onboarding_progress';

interface DetectedIngredient {
  name: string;
  qty?: string;
  plat?: string;
}

interface OnboardingState {
  step: number;
  photoDone: boolean;
  plats: Array<{ id: string; name: string; ingredients: Array<{ name: string; qty: string }> }>;
  posStatus: 'idle' | 'connecting' | 'connected' | 'manual';
  completed: boolean;
}

const defaultState: OnboardingState = {
  step: 1,
  photoDone: false,
  plats: [],
  posStatus: 'idle',
  completed: false,
};

function loadState(): OnboardingState {
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    if (parsed.completed) return defaultState;
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}

function saveState(state: OnboardingState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    if (!state.completed) saveState(state);
  }, [state]);

  const handlePhotoUpload = useCallback(() => {
    setUploading(true);
    setTimeout(() => {
      setState((s) => ({
        ...s,
        plats: [],
        photoDone: true,
      }));
      setUploading(false);
      toast.info("Aucun endpoint d'analyse disponible. Passez à l'étape suivante.");
    }, 800);
  }, []);

  const goNext = useCallback(() => {
    if (state.step < 4) {
      setState((s) => ({ ...s, step: s.step + 1 }));
    } else {
      setCompleting(true);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('flowstock_onboarding_completed', 'true');
        }
        sessionStorage.removeItem(STORAGE_KEY);
        toast.success('Configuration terminée ! Bienvenue sur FlowStock.');
        router.push('/dashboard');
      } catch {
        toast.error('Erreur lors de la finalisation.');
      } finally {
        setCompleting(false);
      }
    }
  }, [state.step, router]);

  const goPrev = useCallback(() => {
    if (state.step > 1) {
      setState((s) => ({ ...s, step: s.step - 1 }));
    }
  }, [state.step]);

  const connectLightspeed = useCallback(() => {
    setState((s) => ({ ...s, posStatus: 'connecting' }));
    setTimeout(() => {
      setState((s) => ({ ...s, posStatus: 'connected' }));
    }, 1200);
  }, []);

  const setPosManual = useCallback(() => {
    setState((s) => ({ ...s, posStatus: 'manual' }));
  }, []);

  const ingredientsFromPlats = state.plats.flatMap((p) =>
    p.ingredients.map((i) => ({ name: i.name, qty: i.qty, plat: p.name }))
  );
  const uniqueIngredients = Array.from(
    new Map(ingredientsFromPlats.map((i) => [i.name, i])).values()
  ) as DetectedIngredient[];

  const importStocksHref =
    uniqueIngredients.length > 0
      ? `/import-stocks?from=onboarding&prefill=${encodeURIComponent(JSON.stringify(uniqueIngredients))}`
      : '/import-stocks?from=onboarding';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
                state.step > s.num ? 'bg-green-mid text-white' : state.step === s.num ? 'bg-green-deep text-white' : 'bg-cream-dark text-gray-warm'
              }`}
            >
              {state.step > s.num ? <Check className="h-4 w-4" /> : s.num}
            </div>
            <span className={`hidden text-xs sm:inline ${state.step === s.num ? 'font-semibold text-green-deep' : 'text-gray-warm'}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`mx-1 h-0.5 flex-1 max-w-8 ${state.step > s.num ? 'bg-green-mid' : 'bg-cream-dark'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-green-deep/10 bg-white p-6 shadow-sm">
        {state.step === 1 && (
          <>
            <h2 className="font-display text-lg font-bold text-green-deep">Étape 1/4 — Photo de carte</h2>
            <p className="mt-1 text-sm text-gray-warm">
              Photographiez ou importez votre carte pour que l&apos;IA détecte les plats et ingrédients. (TODO : connecter à POST /menu/analyze)
            </p>

            {!state.photoDone ? (
              <>
                <div
                  className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-green-deep/20 bg-cream/50 py-12"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handlePhotoUpload();
                  }}
                >
                  {uploading ? (
                    <Loader2 className="h-12 w-12 animate-spin text-green-mid" />
                  ) : (
                    <>
                      <Camera className="mb-3 h-12 w-12 text-green-deep/60" />
                      <p className="font-display text-sm font-semibold text-green-deep">Déposez une photo ou prenez-la</p>
                      <p className="mt-1 text-xs text-gray-warm">L&apos;analyse sera disponible prochainement</p>
                      <button
                        type="button"
                        onClick={handlePhotoUpload}
                        className="mt-4 rounded-lg bg-green-mid px-4 py-2 font-display text-sm font-bold text-white"
                      >
                        Passer cette étape
                      </button>
                    </>
                  )}
                </div>
                <p className="mt-4 text-center">
                  <button
                    type="button"
                    className="text-sm font-medium text-terracotta hover:underline"
                    onClick={handlePhotoUpload}
                  >
                    Passer et continuer manuellement
                  </button>
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-green-mid">
                  ✓ Étape 1 terminée — {state.plats.length > 0 ? `${state.plats.length} plats détectés` : 'continuez vers l\'import'}
                </p>
                {state.plats.length > 0 && (
                  <ul className="mt-4 space-y-3">
                    {state.plats.map((plat) => (
                      <li key={plat.id} className="rounded-lg border border-cream-dark bg-cream/30 p-3">
                        <p className="font-display font-bold text-green-deep">{plat.name}</p>
                        <p className="mt-1 text-xs text-gray-warm">
                          {plat.ingredients.map((i) => `${i.name} ${i.qty}`).join(' · ')}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setState((s) => ({ ...s, photoDone: false }))}
                    className="rounded-lg border border-green-deep/30 px-4 py-2 font-display text-sm font-bold text-green-deep"
                  >
                    Refaire
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="rounded-lg bg-green-mid px-4 py-2 font-display text-sm font-bold text-white"
                  >
                    Continuer →
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {state.step === 2 && (
          <>
            <h2 className="font-display text-lg font-bold text-green-deep">Étape 2/4 — Stocks initiaux</h2>
            <p className="mt-1 text-sm text-gray-warm">
              Pré-remplissage à partir des ingrédients détectés. Vous pouvez importer un fichier ou saisir manuellement.
            </p>

            <div className="mt-4 rounded-xl border border-cream-dark bg-cream/30 p-4">
              <p className="font-display text-xs font-bold uppercase tracking-wider text-gray-warm">Option A : Import fichier</p>
              <p className="mt-1 text-xs text-gray-warm">
                Importez un CSV ou Excel pour créer vos produits et quantités en lot. Vous pouvez passer cette étape et compléter plus tard.
              </p>
              <Link
                href={importStocksHref}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-green-deep/30 bg-white py-3 font-display text-sm font-semibold text-green-deep hover:bg-cream/50"
              >
                <Upload className="h-5 w-5" />
                Importer mes stocks (CSV / Excel)
              </Link>
            </div>
            <div className="mt-4 rounded-xl border border-cream-dark bg-cream/30 p-4">
              <p className="font-display text-xs font-bold uppercase tracking-wider text-gray-warm">Ingrédients depuis l&apos;étape 1</p>
              <ul className="mt-2 space-y-1 text-sm text-charcoal">
                {uniqueIngredients.length > 0 ? (
                  uniqueIngredients.map((i) => (
                    <li key={i.name}>
                      {i.name} {i.qty ? `— ${i.qty}` : '— quantité à saisir'}
                    </li>
                  ))
                ) : (
                  <li className="text-gray-warm">Aucun ingrédient détecté. Importez un fichier ou ajoutez manuellement.</li>
                )}
              </ul>
              <p className="mt-3 text-xs text-gray-warm">
                {uniqueIngredients.length} ingrédient{uniqueIngredients.length > 1 ? 's' : ''} à renseigner · DLC optionnel
              </p>
            </div>
            <p className="mt-2 text-xs text-gray-warm">L&apos;import est optionnel : vous pouvez passer cette étape et compléter vos stocks plus tard depuis le menu.</p>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={goPrev} className="rounded-lg border border-green-deep/30 px-4 py-2 font-display text-sm font-bold text-green-deep">
                ← Retour
              </button>
              <button type="button" onClick={goNext} className="rounded-lg bg-green-mid px-4 py-2 font-display text-sm font-bold text-white">
                Continuer →
              </button>
            </div>
          </>
        )}

        {state.step === 3 && (
          <>
            <h2 className="font-display text-lg font-bold text-green-deep">Étape 3/4 — Connexion caisse</h2>
            <p className="mt-1 text-sm text-gray-warm">
              Connectez votre logiciel de caisse pour que les ventes mettent à jour le stock automatiquement.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-green-deep/20 bg-cream/30 p-4">
                <p className="font-display font-bold text-green-deep">Lightspeed</p>
                <p className="mt-1 text-xs text-gray-warm">Connectez votre caisse Lightspeed</p>
                <button
                  type="button"
                  onClick={connectLightspeed}
                  disabled={state.posStatus === 'connecting' || state.posStatus === 'connected'}
                  className="mt-3 w-full rounded-lg bg-green-mid py-2 font-display text-sm font-bold text-white disabled:opacity-70"
                >
                  {state.posStatus === 'connecting' && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
                  {state.posStatus === 'connected' && '✓ Connecté'}
                  {state.posStatus === 'idle' && 'Connecter'}
                </button>
              </div>
              <div className="rounded-xl border-2 border-terracotta/30 bg-terra-light/20 p-4">
                <p className="font-display font-bold text-terracotta">Saisie manuelle</p>
                <p className="mt-1 text-xs text-gray-warm">Pas de caisse ? Saisissez les ventes à la main.</p>
                <button
                  type="button"
                  onClick={setPosManual}
                  className="mt-3 w-full rounded-lg border-2 border-terracotta py-2 font-display text-sm font-bold text-terracotta"
                >
                  Utiliser la saisie manuelle
                </button>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-warm">Je n&apos;ai pas de logiciel de caisse — la saisie manuelle reste disponible.</p>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={goPrev} className="rounded-lg border border-green-deep/30 px-4 py-2 font-display text-sm font-bold text-green-deep">
                ← Retour
              </button>
              <button type="button" onClick={goNext} className="rounded-lg bg-green-mid px-4 py-2 font-display text-sm font-bold text-white">
                Étape 4/4 →
              </button>
            </div>
          </>
        )}

        {state.step === 4 && (
          <>
            <h2 className="font-display text-lg font-bold text-green-deep">C&apos;est prêt</h2>
            <p className="mt-1 text-sm text-gray-warm">Récapitulatif de votre configuration.</p>
            <ul className="mt-4 space-y-2 text-sm text-charcoal">
              <li>✓ Carte analysée — {state.plats.length > 0 ? 'plats et ingrédients enregistrés' : 'étape passée'}</li>
              <li>✓ Stocks initiaux (ou à compléter plus tard)</li>
              <li>
                ✓ Caisse : {state.posStatus === 'connected' || state.posStatus === 'manual' ? 'Configurée' : 'Saisie manuelle'}
              </li>
            </ul>
            <button
              type="button"
              onClick={goNext}
              disabled={completing}
              className="mt-8 w-full rounded-xl bg-green-mid py-3.5 font-display text-base font-bold text-white disabled:opacity-70"
            >
              {completing ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Lancer mon premier service →'}
            </button>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-gray-warm">
        <Link href="/dashboard" className="hover:text-green-deep">
          Retour au dashboard
        </Link>
      </p>
    </div>
  );
}
