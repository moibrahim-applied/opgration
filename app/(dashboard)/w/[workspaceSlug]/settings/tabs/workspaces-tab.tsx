'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Users, FolderKanban, ArrowRight } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  projectCount: number;
  memberCount: number;
  createdAt: string;
  projects?: Project[];
}

export function WorkspacesTab() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces');
      const data = await res.json();
      const workspacesData = data.workspaces || [];

      // Fetch projects for each workspace
      const workspacesWithProjects = await Promise.all(
        workspacesData.map(async (workspace: Workspace) => {
          try {
            const projectsRes = await fetch(`/api/workspaces/${workspace.id}/projects`);
            const projectsData = await projectsRes.json();
            return {
              ...workspace,
              projects: projectsData.projects || []
            };
          } catch (error) {
            console.error(`Failed to fetch projects for workspace ${workspace.id}:`, error);
            return {
              ...workspace,
              projects: []
            };
          }
        })
      );

      setWorkspaces(workspacesWithProjects);
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newWorkspaceName }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create workspace');
      }

      const data = await res.json();

      setShowCreateModal(false);
      setNewWorkspaceName('');

      await fetchWorkspaces();

      // Redirect to the projects page to create first project
      window.location.href = `/w/${data.workspace.slug}/settings?tab=projects`;
    } catch (error) {
      console.error('Failed to create workspace:', error);
      alert(error instanceof Error ? error.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workspaces</h2>
          <p className="text-muted-foreground mt-1">Manage your organizations and teams</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Workspace
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No workspaces yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Workspaces help you organize your integrations and connections by team or project.
            </p>
            <Button onClick={() => setShowCreateModal(true)} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Create Your First Workspace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <Card
              key={workspace.id}
              className="hover:shadow-lg transition-all hover:border-primary/50"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {workspace.name}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {workspace.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <FolderKanban className="w-4 h-4" />
                    <span>{workspace.projects?.length || 0} projects</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{workspace.memberCount} members</span>
                  </div>
                </div>

                {/* Projects List */}
                {workspace.projects && workspace.projects.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Projects</p>
                    <div className="space-y-1">
                      {workspace.projects.slice(0, 3).map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50 transition-colors"
                        >
                          <FolderKanban className="w-3 h-3 text-muted-foreground" />
                          <span className="text-foreground">{project.name}</span>
                        </div>
                      ))}
                      {workspace.projects.length > 3 && (
                        <p className="text-xs text-muted-foreground pl-5">
                          +{workspace.projects.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Go to Workspace Button */}
                <div className="border-t pt-3 mt-3">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => window.location.href = `/w/${workspace.slug}/dashboard`}
                  >
                    Go to Workspace
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Workspace</CardTitle>
              <CardDescription>
                Create a workspace to organize your integrations and team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspaceName">Workspace Name</Label>
                <Input
                  id="workspaceName"
                  placeholder="My Company"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !creating) {
                      handleCreateWorkspace();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  This will be the name of your organization or team
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewWorkspaceName('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateWorkspace}
                  disabled={creating || !newWorkspaceName.trim()}
                  className="flex-1"
                >
                  {creating ? 'Creating...' : 'Create Workspace'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
