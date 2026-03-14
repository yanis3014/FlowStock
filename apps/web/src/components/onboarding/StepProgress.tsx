'use client';
import type { OnboardingStep } from '@/types/onboarding';

interface StepConfig {
  id: OnboardingStep;
  label: string;
}

interface StepProgressProps {
  steps: StepConfig[];
  current: OnboardingStep;
  completed: OnboardingStep[];
}

export function StepProgress({ steps, current, completed }: StepProgressProps) {
  return (
    <div className="flex items-start px-4 py-3">
      {steps.map((step, index) => {
        const isCompleted = completed.includes(step.id);
        const isCurrent = step.id === current;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all',
                  isCompleted
                    ? 'bg-green-bright text-white'
                    : isCurrent
                      ? 'bg-[#1C2B2A] text-white ring-2 ring-offset-2 ring-[#1C2B2A]'
                      : 'bg-charcoal/10 text-charcoal/40',
                ].join(' ')}
              >
                {isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="hidden sm:block text-xs text-center mt-1 text-charcoal/60 max-w-[60px] leading-tight">
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={[
                  'flex-1 h-px mt-3.5 mx-1',
                  isCompleted ? 'bg-green-bright' : 'bg-charcoal/15',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
