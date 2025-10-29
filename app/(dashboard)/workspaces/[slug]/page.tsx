'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, FolderKanban, Link2, ChevronLeft, Settings, Users } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slug: string;
  connectionCount: number;
  createdAt: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
}

export default function WorkspaceDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchWorkspaceAndProjects();
    }
  }, [slug]);

  const fetchWorkspaceAndProjects = async () => {
    try {
      // TODO: Implement /api/workspaces/[slug] endpoint
      // TODO: Implement /api/workspaces/[slug]/projects endpoint
      setWorkspace(null);
      setProjects([]);
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !workspace) return;

    setCreating(true);
    try {
      // TODO: Implement create project API
      console.log('Creating project:', newProjectName);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Workspace not found</p>
          <Button onClick={() => window.location.href = '/workspaces'}>
            Back to Workspaces
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-8 py-8 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/workspaces'}
            className="mb-6 gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Workspaces
          </Button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-foreground">{workspace.name}</h1>
                  <Badge variant="secondary">{workspace.role}</Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  Manage projects and integrations for this workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <Users className="w-4 h-4" />
                Members ({workspace.memberCount})
              </Button>
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">
        {projects.length === 0 ? (
          /* Empty State */
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FolderKanban className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No projects yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Projects help you organize your integrations and connections by use case or environment.
              </p>
              <Button onClick={() => setShowCreateModal(true)} size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Projects Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer group"
                onClick={() => window.location.href = `/workspaces/${workspace.slug}/projects/${project.slug}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-secondary to-secondary/60 rounded-lg flex items-center justify-center">
                        <FolderKanban className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {project.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Link2 className="w-4 h-4" />
                      <span>{project.connectionCount} connections</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Create New Project</CardTitle>
                <CardDescription>
                  Create a project to organize your integrations and connections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    placeholder="Production Environment"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !creating) {
                        handleCreateProject();
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Choose a name that represents the purpose or environment
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewProjectName('');
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
      </div>
    </div>
  );
}
