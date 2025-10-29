'use client';

import { useState, useEffect } from 'react';

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const res = await fetch('/api/user/onboarding');
      const data = await res.json();

      // Show onboarding if not completed
      setShowOnboarding(!data.completed);
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      setShowOnboarding(false);
    } finally {
      setIsChecking(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await fetch('/api/user/onboarding', { method: 'POST' });
      setShowOnboarding(false);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  const skipOnboarding = async () => {
    try {
      await fetch('/api/user/onboarding', { method: 'POST' });
      setShowOnboarding(false);
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
    }
  };

  return {
    showOnboarding,
    isChecking,
    completeOnboarding,
    skipOnboarding,
  };
}
