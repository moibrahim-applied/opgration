'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlayCircle, X } from 'lucide-react';

interface IntegrationTutorialDialogProps {
  loomVideoUrl?: string;
}

export function IntegrationTutorialDialog({
  loomVideoUrl = 'https://www.loom.com/embed/YOUR_VIDEO_ID_HERE'
}: IntegrationTutorialDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);

  useEffect(() => {
    checkTutorialStatus();
  }, []);

  const checkTutorialStatus = async () => {
    try {
      // Check if user completed onboarding from database
      const res = await fetch('/api/user/onboarding');
      const data = await res.json();

      // Show popup if onboarding is NOT complete
      if (!data.completed) {
        setHasSeenTutorial(false);
        // Auto-show after a short delay for better UX
        setTimeout(() => setIsOpen(true), 1000);
      }
    } catch (error) {
      console.error('Failed to check tutorial status:', error);
    }
  };

  const handleClose = async () => {
    setIsOpen(false);
    setHasSeenTutorial(true);

    // Mark onboarding as complete when they close the dialog
    try {
      await fetch('/api/user/onboarding', { method: 'POST' });
    } catch (error) {
      console.error('Failed to mark onboarding complete:', error);
    }
  };

  const handleWatchLater = async () => {
    setIsOpen(false);
    setHasSeenTutorial(true);

    // Also mark onboarding as complete when they skip
    try {
      await fetch('/api/user/onboarding', { method: 'POST' });
    } catch (error) {
      console.error('Failed to mark onboarding complete:', error);
    }
  };

  if (hasSeenTutorial) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-6 h-6 text-primary" />
              <DialogTitle className="text-2xl">Welcome! Let's Set Up Your First Integration</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription className="text-base">
            Watch this quick 2-minute video to learn how to connect your first integration and start automating!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loom Video Embed */}
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={loomVideoUrl}
              frameBorder="0"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              title="Integration Setup Tutorial"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleWatchLater}
            >
              Watch Later
            </Button>
            <Button
              onClick={handleClose}
            >
              Got It, Let's Start!
            </Button>
          </div>

          {/* Quick Tips */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Quick Tips:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Choose an integration (Google Sheets, Slack, etc.)</li>
              <li>• Click "Connect" and authorize access</li>
              <li>• Select an action and fill in the parameters</li>
              <li>• Test your integration with real data</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
