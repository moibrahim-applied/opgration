'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, FolderKanban } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  authType: string;
}

interface Action {
  id: string;
  name: string;
  slug: string;
  description: string;
  httpMethod: string;
}

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

export default function ConnectIntegrationPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [connectionName, setConnectionName] = useState('');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchIntegration();
      fetchWorkspaces();
    }
  }, [slug]);

  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchProjects(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId]);

  const fetchIntegration = async () => {
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      const found = data.integrations?.find((i: Integration) => i.slug === slug);

      if (found) {
        setIntegration(found);
        fetchActions(found.id);
        setConnectionName(`My ${found.name}`);
      }
    } catch (error) {
      console.error('Failed to fetch integration:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces');
      const data = await res.json();
      setWorkspaces(data.workspaces || []);
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    }
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

  const fetchActions = async (integrationId: string) => {
    try {
      const res = await fetch(`/api/integrations/${integrationId}/actions`);
      const data = await res.json();
      setActions(data.actions || []);
    } catch (error) {
      console.error('Failed to fetch actions:', error);
    }
  };

  const handleConnect = async () => {
    if (!integration || !connectionName.trim() || !selectedWorkspaceId || !selectedProjectId) {
      return;
    }

    setConnecting(true);

    try {
      const res = await fetch('/api/auth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: selectedWorkspaceId,
          projectId: selectedProjectId,
          integrationId: integration.id,
          connectionName,
        }),
      });

      const data = await res.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert('Error: ' + (data.error || 'Failed to initiate connection'));
        setConnecting(false);
      }
    } catch (error) {
      console.error('Failed to create connection:', error);
      alert('Failed to create connection');
      setConnecting(false);
    }
  };

  // Get icon URL
  const n8nIcons: Record<string, string> = {
    'google-drive': 'https://n8n.io/nodes/google-drive.svg',
    'dropbox': 'https://n8n.io/nodes/dropbox.svg',
    'slack': 'https://n8n.io/nodes/slack.svg',
  };

  const iconUrl = integration ? (n8nIcons[integration.slug] || integration.logoUrl || '') : '';

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

  if (!integration) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Integration not found</p>
          <Button onClick={() => window.location.href = '/integrations'} className="mt-4">
            Back to Integrations
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
            onClick={() => window.location.href = '/integrations'}
            className="mb-6"
          >
            ← Back to Integrations
          </Button>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl border">
              <img
                src={iconUrl}
                alt={integration.name}
                className="w-14 h-14 object-contain"
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">{integration.name}</h1>
              <p className="text-lg text-muted-foreground">{integration.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-12 max-w-4xl mx-auto">
        {/* Connection Form Card */}
        <div className="bg-card border rounded-xl p-8 mb-8 shadow-sm">
          <h2 className="text-2xl font-bold text-foreground mb-2">Connect your account</h2>
          <p className="text-muted-foreground mb-6">
            Give this connection a name and authorize access to your {integration.name} account
          </p>

          <div className="space-y-6">
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
                  disabled={connecting}
                  className="w-full h-12 pl-10 bg-background border rounded-lg px-4 text-foreground outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
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
                Choose which workspace this connection belongs to
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
                  disabled={connecting || !selectedWorkspaceId}
                  className="w-full h-12 pl-10 bg-background border rounded-lg px-4 text-foreground outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
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
                Choose which project this connection will be used in
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder={`My ${integration.name}`}
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                disabled={connecting}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                Choose a memorable name to identify this connection
              </p>
            </div>

            <Button
              onClick={handleConnect}
              disabled={connecting || !connectionName.trim() || !selectedWorkspaceId || !selectedProjectId}
              size="lg"
              className="w-full h-12"
            >
              {connecting ? (
                <>
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                  Connecting...
                </>
              ) : (
                `Connect to ${integration.name}`
              )}
            </Button>
          </div>

          <div className="border-t mt-8 pt-6">
            <p className="text-sm text-foreground font-semibold mb-3">
              What happens next?
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="text-primary font-semibold">1.</span>
                <span>You'll be redirected to {integration.name} to authorize access</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-semibold">2.</span>
                <span>After authorizing, you'll be redirected back to Opgration</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-semibold">3.</span>
                <span>You'll receive an API endpoint to use in your workflows</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Available Actions Section */}
        <div className="bg-card border rounded-xl p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-foreground mb-2">Available Actions</h3>
            <p className="text-muted-foreground">
              {actions.length} actions you can perform with {integration.name}
            </p>
          </div>

          {actions.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading actions...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="bg-background border rounded-lg p-5 hover:bg-muted/50 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-foreground">{action.name}</h4>
                    <Badge
                      variant="secondary"
                      className="text-xs"
                    >
                      {action.httpMethod}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{action.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}