'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import type { OnboardingStep, OnboardingProgressData } from '@/types/onboarding';

const STEP_ORDER: OnboardingStep[] = ['profil', 'menu', 'emplacements', 'stocks', 'fournisseurs', 'pos'];

export default function OnboardingIndexPage() {
  const { fetchApi } = useApi();
  const router = useRouter();

  useEffect(() => {
    fetchApi('/onboarding/progress')
      .then((r) => r.json())
      .then((res: { success: boolean; data?: { onboarding_data: OnboardingProgressData | null; onboarding_completed: boolean } }) => {
        const data = res?.data?.onboarding_data;
        if (!data) {
          router.replace('/onboarding/profil');
          return;
        }
        const completed = data.completed_steps ?? [];
        const nextStep = STEP_ORDER.find((s) => !completed.includes(s));
        router.replace(`/onboarding/${nextStep ?? 'profil'}`);
      })
      .catch(() => {
        router.replace('/onboarding/profil');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-deep border-t-transparent" />
    </div>
  );
}
