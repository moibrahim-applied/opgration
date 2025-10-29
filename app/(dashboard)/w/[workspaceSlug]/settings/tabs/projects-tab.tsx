'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FolderKanban, Plus, Trash2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export function ProjectsTab() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkspaceAndProjects();
  }, [workspaceSlug]);

  const fetchWorkspaceAndProjects = async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const wsData = await wsRes.json();
      const ws = wsData.workspaces?.find((w: Workspace) => w.slug === workspaceSlug);
      setWorkspace(ws || null);

      if (ws) {
        const res = await fetch(`/api/workspaces/${ws.id}/projects`);
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !workspace) return;

    setCreating(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create project');
      }

      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDescription('');

      await fetchWorkspaceAndProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
      alert(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete project');
      }

      await fetchWorkspaceAndProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete project');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-muted-foreground mt-1">Organize your connections by project in {workspace?.name || 'this workspace'}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FolderKanban className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Projects help you organize your integrations and connections. Create your first project to get started.
            </p>
            <Button onClick={() => setShowCreateModal(true)} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-lg transition-all hover:border-primary/50"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <FolderKanban className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                {project.description && (
                  <CardDescription className="text-sm">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDeleteProject(project.id, project.name)}
                  disabled={deleting === project.id}
                >
                  {deleting === project.id ? (
                    <>
                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Project
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Project</CardTitle>
              <CardDescription>
                Create a project to organize your integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  placeholder="My Project"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !creating) {
                      handleCreateProject();
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectDescription">Description (Optional)</Label>
                <Textarea
                  id="projectDescription"
                  placeholder="A brief description of this project"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewProjectName('');
                    setNewProjectDescription('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={creating || !newProjectName.trim()}
                  className="flex-1"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
