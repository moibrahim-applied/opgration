'use client';

import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';

export function ForceOnboardingButton() {
  const handleForceOnboarding = async () => {
    if (!confirm('This will delete ALL your workspaces and restart onboarding. Are you sure?')) {
      return;
    }

    try {
      // Get all workspaces
      const res = await fetch('/api/workspaces');
      const data = await res.json();

      if (data.workspaces && data.workspaces.length > 0) {
        // Delete each workspace
        for (const workspace of data.workspaces) {
          await fetch(`/api/workspaces/${workspace.id}`, {
            method: 'DELETE',
          });
        }
      }

      // Clear onboarding flag
      localStorage.removeItem('onboarding_completed');

      // Reload page
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to reset:', error);
      alert('Failed to reset. Check console for errors.');
    }
  };

  return (
    <Button
      variant="destructive"
      onClick={handleForceOnboarding}
      className="gap-2"
    >
      <Rocket className="w-4 h-4" />
      Reset & Restart Onboarding
    </Button>
  );
}
