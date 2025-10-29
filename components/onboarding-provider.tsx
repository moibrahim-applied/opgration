'use client';

import { useOnboarding } from '@/lib/use-onboarding';
import { OnboardingWizard } from './onboarding-wizard';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { showOnboarding, isChecking, completeOnboarding, skipOnboarding } = useOnboarding();

  if (isChecking) {
    // Show nothing while checking
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      )}
    </>
  );
}
