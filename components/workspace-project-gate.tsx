'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Building2, FolderKanban, AlertCircle } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface WorkspaceProjectGateProps {
  children: React.ReactNode;
}

export function WorkspaceProjectGate({ children }: WorkspaceProjectGateProps) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkSelection();
  }, []);

  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchProjects(selectedWorkspaceId);
    } else {
      setProjects([]);
      setSelectedProjectId('');
    }
  }, [selectedWorkspaceId]);

  const checkSelection = async () => {
    // Check localStorage for existing selection
    const savedWorkspaceId = localStorage.getItem('selectedWorkspaceId');
    const savedProjectId = localStorage.getItem('selectedProjectId');

    // Fetch workspaces
    const res = await fetch('/api/workspaces');
    const data = await res.json();
    const fetchedWorkspaces = data.workspaces || [];
    setWorkspaces(fetchedWorkspaces);

    // If no saved selection or invalid, show gate
    if (!savedWorkspaceId || !savedProjectId) {
      setLoading(false);
      return;
    }

    // Verify saved workspace exists
    const workspaceExists = fetchedWorkspaces.find((w: Workspace) => w.id === savedWorkspaceId);
    if (!workspaceExists) {
      localStorage.removeItem('selectedWorkspaceId');
      localStorage.removeItem('selectedProjectId');
      setLoading(false);
      return;
    }

    // Fetch projects for saved workspace
    const projectsRes = await fetch(`/api/workspaces/${savedWorkspaceId}/projects`);
    const projectsData = await projectsRes.json();
    const fetchedProjects = projectsData.projects || [];

    // Verify saved project exists
    const projectExists = fetchedProjects.find((p: Project) => p.id === savedProjectId);
    if (!projectExists) {
      localStorage.removeItem('selectedProjectId');
      setSelectedWorkspaceId(savedWorkspaceId);
      setProjects(fetchedProjects);
      setLoading(false);
      return;
    }

    // All valid - allow access
    setSelectedWorkspaceId(savedWorkspaceId);
    setSelectedProjectId(savedProjectId);
    setProjects(fetchedProjects);
    setLoading(false);
  };

  const fetchProjects = async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects`);
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const handleContinue = () => {
    if (!selectedWorkspaceId || !selectedProjectId) {
      return;
    }

    setSaving(true);
    localStorage.setItem('selectedWorkspaceId', selectedWorkspaceId);
    localStorage.setItem('selectedProjectId', selectedProjectId);

    // Trigger a page reload to update the sidebar and allow access
    window.location.reload();
  };

  const handleCreateWorkspace = () => {
    router.push('/workspaces');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show gate if no valid selection
  if (!selectedWorkspaceId || !selectedProjectId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-2">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Select Workspace & Project</CardTitle>
            <CardDescription className="text-base mt-2">
              You must select a workspace and project before you can access this page.
              All your integrations and connections will be organized under these.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {workspaces.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  You don't have any workspaces yet. Create one to get started.
                </p>
                <Button onClick={handleCreateWorkspace} size="lg">
                  <Building2 className="w-4 h-4 mr-2" />
                  Create Your First Workspace
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="workspace">Workspace</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      id="workspace"
                      value={selectedWorkspaceId}
                      onChange={(e) => {
                        setSelectedWorkspaceId(e.target.value);
                        setSelectedProjectId('');
                      }}
                      className="w-full h-12 pl-10 bg-background border rounded-lg px-4 text-foreground outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select a workspace</option>
                      {workspaces.map((workspace) => (
                        <option key={workspace.id} value={workspace.id}>
                          {workspace.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your workspace is like your organization or team
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project">Project</Label>
                  <div className="relative">
                    <FolderKanban className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      id="project"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      disabled={!selectedWorkspaceId}
                      className="w-full h-12 pl-10 bg-background border rounded-lg px-4 text-foreground outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select a project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Projects help you organize integrations by environment or use case
                  </p>
                </div>

                <Button
                  onClick={handleContinue}
                  disabled={!selectedWorkspaceId || !selectedProjectId || saving}
                  size="lg"
                  className="w-full"
                >
                  {saving ? 'Saving...' : 'Continue'}
                </Button>

                <div className="text-center pt-4">
                  <Button variant="link" onClick={handleCreateWorkspace}>
                    or create a new workspace
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid selection - render children
  return <>{children}</>;
}
