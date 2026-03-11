'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, ArrowRight, Sparkles } from 'lucide-react';

interface OnboardingBannerProps {
  onDismiss?: () => void;
}

export function OnboardingBanner({ onDismiss }: OnboardingBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const sessionDismissed = sessionStorage.getItem('flowstock_banner_dismissed');
    if (sessionDismissed === 'true') {
      setDismissed(true);
    }

    // Le dismiss reste temporaire dans la session active, mais on le réinitialise au rechargement.
    const clearDismissOnUnload = () => sessionStorage.removeItem('flowstock_banner_dismissed');
    window.addEventListener('beforeunload', clearDismissOnUnload);
    return () => window.removeEventListener('beforeunload', clearDismissOnUnload);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('flowstock_banner_dismissed', 'true');
    setDismissed(true);
    onDismiss?.();
  };

  const handleStart = () => {
    router.push('/onboarding');
  };

  if (dismissed) return null;

  return (
    <div className="relative mb-6 flex w-full items-center justify-between gap-4 rounded-xl bg-green-deep px-5 py-4 text-cream shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-cream/15">
          <Sparkles className="h-5 w-5 text-cream" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold leading-tight text-cream">
            Finalisez la configuration de FlowStock
          </p>
          <p className="mt-0.5 text-xs leading-snug text-cream/70">
            Ajoutez vos stocks, connectez votre caisse et activez les suggestions IA en quelques minutes.
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          onClick={handleStart}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-cream px-3 py-2 text-xs font-semibold text-green-deep transition-colors hover:bg-cream/90"
        >
          Commencer
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDismiss}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-cream/60 transition-colors hover:bg-cream/10 hover:text-cream"
          aria-label="Masquer la bannière"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
