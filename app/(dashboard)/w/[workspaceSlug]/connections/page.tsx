'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, Plus, ExternalLink, Trash2, RefreshCw, Building2, FolderKanban, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Connection {
  id: string;
  name: string;
  integration: {
    name: string;
    logoUrl: string;
    slug: string;
  };
  workspace: {
    name: string;
    slug: string;
  };
  project: {
    name: string;
    slug: string;
  };
  isActive: boolean;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export default function ConnectionsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceSlug = params?.workspaceSlug as string;

  const [connections, setConnections] = useState<Connection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (workspaceSlug) {
      fetchWorkspaceAndProjects();
    }
  }, [workspaceSlug]);

  useEffect(() => {
    // Get projectId from URL params
    const projectIdParam = searchParams.get('projectId');
    if (projectIdParam) {
      setSelectedProjectId(projectIdParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (workspaceSlug && workspace) {
      fetchConnections();
    }
  }, [workspaceSlug, selectedProjectId, workspace]);

  const fetchWorkspaceAndProjects = async () => {
    try {
      // Fetch workspace
      const wsRes = await fetch('/api/workspaces');
      const wsData = await wsRes.json();
      const ws = wsData.workspaces?.find((w: Workspace) => w.slug === workspaceSlug);
      setWorkspace(ws || null);

      if (ws) {
        // Fetch projects
        const projectsRes = await fetch(`/api/workspaces/${ws.id}/projects`);
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch workspace and projects:', error);
    }
  };

  const fetchConnections = async () => {
    try {
      let url = `/api/connections?workspaceSlug=${workspaceSlug}`;
      if (selectedProjectId && selectedProjectId !== 'all') {
        url += `&projectId=${selectedProjectId}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);

    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    if (projectId === 'all') {
      params.delete('projectId');
    } else {
      params.set('projectId', projectId);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleDeleteAll = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ALL ${connections.length} connection(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      // Delete all connections in parallel
      const deletePromises = connections.map((connection) =>
        fetch(`/api/connections/${connection.id}`, {
          method: 'DELETE',
        })
      );

      await Promise.all(deletePromises);

      // Refresh the list
      await fetchConnections();

      alert('All connections deleted successfully!');
    } catch (error) {
      console.error('Failed to delete all connections:', error);
      alert('Failed to delete some connections. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-8 py-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Connections</h1>
                <p className="text-muted-foreground mt-1">Manage your connected integrations</p>
              </div>
            </div>
          </div>

          {/* Project Filter & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderKanban className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedProjectId} onValueChange={handleProjectChange}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProjectId !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {projects.find(p => p.id === selectedProjectId)?.name}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {connections.length > 0 && (
                <Button
                  onClick={handleDeleteAll}
                  disabled={deleting}
                  variant="destructive"
                  className="gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete All ({connections.length})
                    </>
                  )}
                </Button>
              )}
              <Button onClick={() => window.location.href = `/w/${workspaceSlug}/integrations`} className="gap-2">
                <Plus className="w-4 h-4" />
                New Connection
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">
        {connections.length === 0 ? (
          /* Empty State */
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Link2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No connections yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Connect your first integration to start automating your workflows and building powerful API integrations.
              </p>
              <Button onClick={() => window.location.href = `/w/${workspaceSlug}/integrations`} size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                Connect Your First Integration
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Connections Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map((connection) => (
              <Card key={connection.id} className="hover:shadow-lg transition-all hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {connection.integration.logoUrl && (
                        <div className="w-12 h-12 rounded-lg bg-white border shadow-sm flex items-center justify-center">
                          <img
                            src={connection.integration.logoUrl}
                            alt={connection.integration.name}
                            className="w-10 h-10 object-contain"
                          />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{connection.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {connection.integration.name}
                        </p>
                      </div>
                    </div>
                    <Badge variant={connection.isActive ? "default" : "secondary"}>
                      {connection.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Building2 className="w-3 h-3" />
                    <span>{connection.workspace.name}</span>
                    <span>/</span>
                    <FolderKanban className="w-3 h-3" />
                    <span>{connection.project.name}</span>
                  </div>

                  <CardDescription className="text-xs">
                    Connected {new Date(connection.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.location.href = `/w/${workspaceSlug}/connections/${connection.id}`}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}