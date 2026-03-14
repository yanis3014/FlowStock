'use client';
import { usePathname } from 'next/navigation';
import { StepProgress } from '@/components/onboarding/StepProgress';
import type { OnboardingStep } from '@/types/onboarding';

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: 'profil', label: 'Profil' },
  { id: 'menu', label: 'Menu' },
  { id: 'emplacements', label: 'Stocks' },
  { id: 'stocks', label: 'Inventaire' },
  { id: 'fournisseurs', label: 'Fournisseurs' },
  { id: 'pos', label: 'Caisse' },
];

const STEP_ORDER: OnboardingStep[] = ['profil', 'menu', 'emplacements', 'stocks', 'fournisseurs', 'pos'];

function getStepFromPathname(pathname: string): OnboardingStep {
  const segment = pathname.split('/').pop() as OnboardingStep;
  return STEP_ORDER.includes(segment) ? segment : 'profil';
}

function getCompletedSteps(current: OnboardingStep): OnboardingStep[] {
  const idx = STEP_ORDER.indexOf(current);
  return idx > 0 ? STEP_ORDER.slice(0, idx) : [];
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentStep = getStepFromPathname(pathname ?? '');
  const completedSteps = getCompletedSteps(currentStep);

  if (pathname?.endsWith('/done')) {
    return (
      <div className="min-h-screen bg-cream">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-[#1C2B2A] text-white sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">FlowStock</span>
          <span className="text-sm opacity-75 hidden sm:block">Configuration de votre restaurant</span>
        </div>
        <StepProgress
          steps={STEPS}
          current={currentStep}
          completed={completedSteps}
        />
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
