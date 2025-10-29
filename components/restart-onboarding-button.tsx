'use client';

import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';

export function RestartOnboardingButton() {
  const handleRestart = async () => {
    if (!confirm('This will reset your onboarding status. Continue?')) return;

    try {
      // Reset onboarding status in database
      await fetch('/api/user/onboarding', {
        method: 'DELETE',
      });
      window.location.reload();
    } catch (error) {
      console.error('Failed to restart onboarding:', error);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleRestart}
      className="gap-2"
    >
      <Rocket className="w-4 h-4" />
      Restart Tutorial
    </Button>
  );
}
