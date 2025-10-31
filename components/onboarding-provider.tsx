'use client';

import { useEffect, useState } from 'react';
import { useOnboarding } from '@/lib/use-onboarding';
import { OnboardingWizard } from './onboarding-wizard';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { showOnboarding, isChecking, completeOnboarding, skipOnboarding } = useOnboarding();
  const [wizardDismissed, setWizardDismissed] = useState(true);

  useEffect(() => {
    // Check if wizard was already dismissed
    const dismissed = localStorage.getItem('onboarding_wizard_dismissed');
    setWizardDismissed(dismissed === 'true');
  }, []);

  const handleSkip = () => {
    // Mark wizard as dismissed so it doesn't show again
    localStorage.setItem('onboarding_wizard_dismissed', 'true');
    setWizardDismissed(true);
    skipOnboarding();
  };

  const handleComplete = async () => {
    // Mark wizard as dismissed
    localStorage.setItem('onboarding_wizard_dismissed', 'true');
    setWizardDismissed(true);
    await completeOnboarding();
  };

  if (isChecking) {
    // Show nothing while checking
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {showOnboarding && !wizardDismissed && (
        <OnboardingWizard
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      )}
    </>
  );
}
