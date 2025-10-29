'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, FolderKanban, CheckCircle, Link2 } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  iconSvg?: string;
  authType: string;
}

interface Action {
  id: string;
  name: string;
  slug: string;
  description: string;
  httpMethod: string;
}

interface Connection {
  id: string;
  name: string;
  organizationId: string;
  projectId: string;
  isActive: boolean;
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

export default function ActionSetupPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params?.workspaceSlug as string;
  const slug = params?.slug as string;
  const actionSlug = params?.actionSlug as string;

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [existingConnection, setExistingConnection] = useState<Connection | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [connectionName, setConnectionName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (slug && actionSlug) {
      fetchData();
    }
  }, [slug, actionSlug]);

  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchProjects(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (selectedWorkspaceId && selectedProjectId && integration) {
      checkExistingConnection();
    }
  }, [selectedWorkspaceId, selectedProjectId, integration]);

  const fetchData = async () => {
    try {
      // Fetch integration
      const res = await fetch('/api/integrations');
      const data = await res.json();
      const foundIntegration = data.integrations?.find((i: Integration) => i.slug === slug);

      if (foundIntegration) {
        setIntegration(foundIntegration);

        // Fetch action
        const actionsRes = await fetch(`/api/integrations/${foundIntegration.id}/actions`);
        const actionsData = await actionsRes.json();
        const foundAction = actionsData.actions?.find((a: Action) => a.slug === actionSlug);
        setAction(foundAction || null);

        setConnectionName(`${foundIntegration.name} - ${foundAction?.name || 'Connection'}`);
      }

      // Fetch workspaces
      await fetchWorkspaces();

      // Check for existing connection
      await checkExistingConnection();
    } catch (error) {
      console.error('Failed to fetch data:', error);
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

  const checkExistingConnection = async () => {
    try {
      if (!integration?.id || !selectedWorkspaceId || !selectedProjectId) {
        return;
      }

      // Check if there's an active connection for this integration in this workspace/project
      const res = await fetch(`/api/integrations/${integration.id}/connections?organizationId=${selectedWorkspaceId}&projectId=${selectedProjectId}`);
      const data = await res.json();

      if (data.connections && data.connections.length > 0) {
        const activeConnection = data.connections.find((c: any) => c.is_active);
        if (activeConnection) {
          setExistingConnection({
            id: activeConnection.id,
            name: activeConnection.name,
            organizationId: activeConnection.organization_id,
            projectId: activeConnection.project_id,
            isActive: activeConnection.is_active,
          });
        }
      }
    } catch (error) {
      console.error('Failed to check existing connection:', error);
    }
  };

  const handleConnect = async () => {
    if (!integration || !action || !selectedWorkspaceId || !selectedProjectId || !connectionName.trim()) {
      return;
    }

    setConnecting(true);

    try {
      if (integration.authType === 'oauth2') {
        // OAuth flow
        const res = await fetch('/api/auth/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: selectedWorkspaceId,
            projectId: selectedProjectId,
            integrationId: integration.id,
            connectionName,
            actionSlug: action.slug,
          }),
        });

        const data = await res.json();

        if (data.authUrl) {
          window.location.href = data.authUrl;
        } else {
          console.error('No auth URL returned');
          setConnecting(false);
        }
      } else if (integration.authType === 'api_key') {
        // API Key flow
        const res = await fetch('/api/auth/connect-apikey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: selectedWorkspaceId,
            projectId: selectedProjectId,
            integrationId: integration.id,
            connectionName,
            apiKey,
          }),
        });

        const data = await res.json();

        if (data.success) {
          // Redirect to connection page
          router.push(`/w/${workspaceSlug}/connections/${data.connectionId}`);
        } else {
          console.error('Failed to create connection:', data.error);
          alert(data.error || 'Failed to create connection');
          setConnecting(false);
        }
      } else {
        // Other auth types not yet implemented
        console.error('Auth type not yet implemented:', integration.authType);
        setConnecting(false);
      }
    } catch (error) {
      console.error('Connection error:', error);
      setConnecting(false);
    }
  };

  const handleUseExistingConnection = () => {
    if (existingConnection) {
      // Redirect to the connection detail page where they can see all actions and API docs
      router.push(`/w/${workspaceSlug}/connections/${existingConnection.id}`);
    }
  };

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

  if (!integration || !action) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Action not found</p>
          <Button onClick={() => router.push(`/w/${workspaceSlug}/integrations`)}>
            Back to Integrations
          </Button>
        </div>
      </div>
    );
  }

  const iconUrl = integration.iconSvg || integration.logoUrl;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-8 py-8 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push(`/w/${workspaceSlug}/integrations/${slug}`)}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {integration.name}
          </Button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg border">
              <img src={iconUrl} alt={integration.name} className="w-12 h-12 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{action.name}</h1>
              <p className="text-muted-foreground">{action.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-4xl mx-auto">
        {/* Existing Connection Option */}
        {existingConnection && (
          <Card className="mb-6 border-primary/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Existing Connection Found</CardTitle>
                    <CardDescription>
                      You already have an active connection: {existingConnection.name}
                    </CardDescription>
                  </div>
                </div>
                <Button onClick={handleUseExistingConnection}>
                  Use This Connection
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* New Connection Setup */}
        <Card>
          <CardHeader>
            <CardTitle>
              {existingConnection ? 'Or Create New Connection' : 'Setup Connection'}
            </CardTitle>
            <CardDescription>
              Configure the connection details for this action
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                placeholder={`${integration.name} Connection`}
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                disabled={connecting}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                A memorable name to identify this connection
              </p>
            </div>

            {integration.authType === 'api_key' && (
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={(integration.authConfig as any)?.api_key_placeholder || 'Enter your API key'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={connecting}
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">
                  Your API key will be encrypted and stored securely
                </p>
              </div>
            )}

            <Button
              onClick={handleConnect}
              disabled={
                connecting ||
                !selectedWorkspaceId ||
                !selectedProjectId ||
                !connectionName.trim() ||
                (integration.authType === 'api_key' && !apiKey.trim())
              }
              size="lg"
              className="w-full h-12"
            >
              {connecting ? (
                <>
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Connect {integration.name}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
