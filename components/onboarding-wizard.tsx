'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  ChevronRight,
  Building2,
  FolderKanban,
  Link2,
  Sparkles,
  X,
  Rocket
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Platform',
    description: 'Let\'s get you set up in just a few steps',
    icon: <Rocket className="w-12 h-12 text-primary" />,
    required: false,
  },
  {
    id: 'workspace',
    title: 'Create Your Workspace',
    description: 'A workspace is where your team collaborates',
    icon: <Building2 className="w-12 h-12 text-primary" />,
    required: true,
  },
  {
    id: 'project',
    title: 'Create Your First Project',
    description: 'Projects help you organize your integrations',
    icon: <FolderKanban className="w-12 h-12 text-primary" />,
    required: true,
  },
  {
    id: 'connection',
    title: 'Setup Your First Connection',
    description: 'Connect to services like Google Sheets, Slack, and more',
    icon: <Link2 className="w-12 h-12 text-primary" />,
    required: false,
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Start building powerful integrations',
    icon: <Sparkles className="w-12 h-12 text-primary" />,
    required: false,
  },
];

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Workspace form
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState('');

  // Project form
  const [projectName, setProjectName] = useState('');
  const [projectSlug, setProjectSlug] = useState('');
  const [createdProjectId, setCreatedProjectId] = useState('');

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  // Helper to format slug input
  const handleSlugChange = (value: string, setter: (value: string) => void) => {
    const formatted = value
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    setter(formatted);
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCompletedSteps([...completedSteps, currentStepData.id]);
      setCurrentStep(currentStep + 1);
    } else {
      // Final step
      onComplete();
    }
  };

  const handleSkipStep = () => {
    if (currentStepData.required) {
      return; // Can't skip required steps
    }

    if (currentStep === ONBOARDING_STEPS.length - 1) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkipTutorial = () => {
    // Only allow skipping if required steps are completed
    const hasWorkspace = completedSteps.includes('workspace');
    const hasProject = completedSteps.includes('project');

    if (hasWorkspace && hasProject) {
      onSkip();
    }
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim() || !workspaceSlug.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workspaceName,
          slug: workspaceSlug,
        }),
      });

      const data = await res.json();

      if (data.workspace) {
        setCreatedWorkspaceId(data.workspace.id);
        // Keep the slug for navigation
        setCompletedSteps([...completedSteps, 'workspace']);
        setTimeout(() => setCurrentStep(currentStep + 1), 500);
      } else {
        alert(data.error || 'Failed to create workspace');
      }
    } catch (error) {
      console.error('Failed to create workspace:', error);
      alert('Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || !projectSlug.trim() || !createdWorkspaceId) return;

    setIsCreating(true);
    try {
      const res = await fetch(`/api/workspaces/${createdWorkspaceId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          slug: projectSlug,
        }),
      });

      const data = await res.json();

      if (data.project) {
        setCreatedProjectId(data.project.id);
        setCompletedSteps([...completedSteps, 'project']);
        setTimeout(() => setCurrentStep(currentStep + 1), 500);
      } else {
        alert(data.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center mb-6">
              {currentStepData.icon}
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-3">Welcome! 👋</h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Let's set up your account in just a few simple steps.
                This will only take a minute!
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Button onClick={handleNext} size="lg" className="gap-2">
                Get Started <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case 'workspace':
        return (
          <div className="space-y-6">
            <div className="flex justify-center mb-6">
              {currentStepData.icon}
            </div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">{currentStepData.title}</h2>
              <p className="text-muted-foreground">{currentStepData.description}</p>
            </div>
            <div className="space-y-4 max-w-md mx-auto">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace Name *</Label>
                <Input
                  id="workspace-name"
                  placeholder="My Company"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-slug">Workspace Slug *</Label>
                <Input
                  id="workspace-slug"
                  placeholder="my-company"
                  value={workspaceSlug}
                  onChange={(e) => handleSlugChange(e.target.value, setWorkspaceSlug)}
                  className="h-12 font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  This will be used in your workspace URL
                </p>
              </div>
              <Button
                onClick={handleCreateWorkspace}
                disabled={!workspaceName.trim() || !workspaceSlug.trim() || isCreating}
                className="w-full h-12"
                size="lg"
              >
                {isCreating ? 'Creating...' : 'Create Workspace'}
              </Button>
            </div>
          </div>
        );

      case 'project':
        return (
          <div className="space-y-6">
            <div className="flex justify-center mb-6">
              {currentStepData.icon}
            </div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">{currentStepData.title}</h2>
              <p className="text-muted-foreground">{currentStepData.description}</p>
            </div>
            <div className="space-y-4 max-w-md mx-auto">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name *</Label>
                <Input
                  id="project-name"
                  placeholder="My First Project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-slug">Project Slug *</Label>
                <Input
                  id="project-slug"
                  placeholder="my-first-project"
                  value={projectSlug}
                  onChange={(e) => handleSlugChange(e.target.value, setProjectSlug)}
                  className="h-12 font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  This will be used in your project URL
                </p>
              </div>
              <Button
                onClick={handleCreateProject}
                disabled={!projectName.trim() || !projectSlug.trim() || isCreating}
                className="w-full h-12"
                size="lg"
              >
                {isCreating ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </div>
        );

      case 'connection':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center mb-6">
              {currentStepData.icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-3">{currentStepData.title}</h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto mb-6">
                Connect to services like Google Sheets, Slack, Notion, and more to start automating your workflows.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={handleSkipStep}
                size="lg"
              >
                Skip for Now
              </Button>
              <Button
                onClick={() => {
                  onComplete();
                  // Use window.location for full page reload to refresh sidebar
                  window.location.href = `/w/${workspaceSlug}/integrations`;
                }}
                size="lg"
                className="gap-2"
              >
                Browse Integrations <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-3">You're All Set! 🎉</h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Your workspace and project are ready. Start building powerful integrations now!
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Button
                onClick={() => {
                  onComplete();
                  // Use window.location for full page reload to refresh sidebar
                  window.location.href = `/w/${workspaceSlug}/integrations`;
                }}
                size="lg"
                className="gap-2"
              >
                Go to Dashboard <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canSkipTutorial = completedSteps.includes('workspace') && completedSteps.includes('project');

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl shadow-2xl border-2 animate-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="relative">
          {canSkipTutorial && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipTutorial}
              className="absolute top-4 right-4"
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </span>
              {!currentStepData.required && currentStepData.id !== 'welcome' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipStep}
                  className="text-xs"
                >
                  Skip Step
                </Button>
              )}
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2">
            {ONBOARDING_STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-primary'
                    : completedSteps.includes(step.id)
                    ? 'bg-green-500'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="min-h-[400px] flex flex-col justify-center">
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
}
