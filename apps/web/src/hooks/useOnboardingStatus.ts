'use client';

import { useState, useEffect } from 'react';

interface OnboardingStatus {
  completed: boolean;
  loading: boolean;
}

export function useOnboardingStatus(): OnboardingStatus {
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const localCompleted = localStorage.getItem('flowstock_onboarding_completed') === 'true';
    setCompleted(localCompleted);
    setLoading(false);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'flowstock_onboarding_completed' && e.newValue === 'true') {
        setCompleted(true);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return { completed, loading };
}
