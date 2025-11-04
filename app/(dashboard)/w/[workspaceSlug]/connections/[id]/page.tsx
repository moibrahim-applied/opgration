'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Copy, CheckCircle, Link2, Zap, Building2, FolderKanban, Play, Trash2 } from 'lucide-react';
import { InteractiveApiBuilder } from '@/components/interactive-api-builder';

interface Connection {
  id: string;
  name: string;
  organizationId: string;
  projectId: string;
  isActive: boolean;
  createdAt: string;
  integration: {
    id: string;
    name: string;
    slug: string;
    description: string;
    logoUrl: string;
    iconSvg?: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  project: {
    id: string;
    name: string;
    slug: string;
  };
}

interface Action {
  id: string;
  name: string;
  slug: string;
  description: string;
  httpMethod: string;
  requestSchema?: {
    type: string;
    properties: Record<string, {
      type: string;
      required?: boolean;
      default?: any;
    }>;
  };
}

export default function ConnectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params?.workspaceSlug as string;
  const connectionId = params?.id as string;

  const [connection, setConnection] = useState<Connection | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [actionParameters, setActionParameters] = useState<Record<string, Record<string, string>>>({});
  const [executing, setExecuting] = useState<string | null>(null);
  const [executionResults, setExecutionResults] = useState<Record<string, any>>({});
  const [deleting, setDeleting] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (connectionId) {
      fetchConnection();
    }
  }, [connectionId]);

  const fetchConnection = async () => {
    try {
      const res = await fetch(`/api/connections/${connectionId}`);
      const data = await res.json();

      if (data.connection) {
        setConnection({
          id: data.connection.id,
          name: data.connection.name,
          organizationId: data.connection.organization_id,
          projectId: data.connection.project_id,
          isActive: data.connection.is_active,
          createdAt: data.connection.created_at,
          integration: {
            id: data.connection.integrations.id,
            name: data.connection.integrations.name,
            slug: data.connection.integrations.slug,
            description: data.connection.integrations.description,
            logoUrl: data.connection.integrations.logo_url,
            iconSvg: data.connection.integrations.icon_svg,
          },
          organization: data.connection.organizations,
          project: data.connection.projects,
        });

        // Transform actions to camelCase
        const transformedActions = (data.actions || []).map((action: any) => ({
          id: action.id,
          name: action.name,
          slug: action.slug,
          description: action.description,
          httpMethod: action.http_method,
          requestSchema: action.request_schema,
        }));
        setActions(transformedActions);
      }
    } catch (error) {
      console.error('Failed to fetch connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (actionSlug: string, parameters?: Record<string, any>) => {
    if (!connection) return;

    setExecuting(actionSlug);
    setExecutionResults({ ...executionResults, [actionSlug]: null });

    try {
      // Use provided parameters or fall back to state
      const params = parameters || actionParameters[actionSlug] || {};

      const res = await fetch('/api/v2/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_id: connection.organizationId,
          project_id: connection.projectId,
          connection_id: connection.id,
          action: actionSlug,
          parameters: params,
        }),
      });

      const data = await res.json();

      // Add status code info for debugging
      if (!res.ok) {
        setExecutionResults({
          ...executionResults,
          [actionSlug]: {
            error: data.error || 'Request failed',
            status: res.status,
            details: data
          }
        });
      } else {
        setExecutionResults({ ...executionResults, [actionSlug]: data });
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
      setExecutionResults({ ...executionResults, [actionSlug]: { error: 'Failed to execute action', details: error instanceof Error ? error.message : 'Unknown error' } });
    } finally {
      setExecuting(null);
    }
  };

  const handleDelete = async () => {
    if (!connection) return;
    if (!confirm(`Are you sure you want to delete the connection "${connection.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/connections/${connection.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push(`/w/${workspaceSlug}/connections`);
      } else {
        const data = await res.json();
        alert(`Failed to delete connection: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete connection:', error);
      alert('Failed to delete connection');
    } finally {
      setDeleting(false);
    }
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'POST':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'PUT':
      case 'PATCH':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'DELETE':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading connection details...</p>
        </div>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Connection not found</p>
          <Button onClick={() => router.push(`/w/${workspaceSlug}/connections`)}>
            Back to Connections
          </Button>
        </div>
      </div>
    );
  }

  const iconUrl = connection.integration.iconSvg || connection.integration.logoUrl;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-8 py-8 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push(`/w/${workspaceSlug}/connections`)}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Connections
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg border">
                <img src={iconUrl} alt={connection.integration.name} className="w-12 h-12 object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-foreground">{connection.name}</h1>
                  <Badge variant={connection.isActive ? 'default' : 'secondary'} className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {connection.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{connection.integration.description}</p>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
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
                  Delete Connection
                </>
              )}
            </Button>
          </div>

          {/* Connection Info */}
          <div className="mt-6 flex gap-4">
            <Card className="flex-1">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Workspace:</span>
                  <span className="font-medium">{connection.organization.name}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <FolderKanban className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Project:</span>
                  <span className="font-medium">{connection.project.name}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Available Actions
            </CardTitle>
            <CardDescription>
              Use these API endpoints to execute actions with this connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            {actions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No actions available for this integration</p>
              </div>
            ) : (
              <>
                {/* Action Selector */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Select Action to View Details
                  </label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="max-w-md">
                      <SelectValue placeholder="Select an action..." />
                    </SelectTrigger>
                    <SelectContent>
                      {actions.map((action) => (
                        <SelectItem key={action.id} value={action.slug}>
                          {action.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!actionFilter || actionFilter === '' ? (
                  <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                    <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-foreground mb-2">Select an Action</p>
                    <p className="text-sm text-muted-foreground">Choose an action from the dropdown above to view its documentation and test it</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                  {actions
                    .filter((action) => action.slug === actionFilter)
                    .map((action) => {
                  const httpMethod = action.httpMethod || action.http_method || 'POST';

                  return (
                    <Card key={action.id} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle className="text-lg">{action.name}</CardTitle>
                              <Badge className={`${getMethodColor(httpMethod)} font-mono text-xs`}>
                                {httpMethod.toUpperCase()}
                              </Badge>
                            </div>
                            <CardDescription>{action.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Tabs defaultValue="builder" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="builder">Interactive Builder</TabsTrigger>
                            <TabsTrigger value="execute">Quick Test</TabsTrigger>
                          </TabsList>

                          <TabsContent value="builder" className="mt-6">
                            <InteractiveApiBuilder
                              action={action}
                              connectionId={connection.id}
                              workspaceId={connection.organizationId}
                              projectId={connection.projectId}
                              baseUrl={baseUrl}
                              onExecute={(params) => {
                                // Pass parameters directly to avoid async state issues
                                handleExecuteAction(action.slug, params);
                              }}
                              executing={executing === action.slug}
                              executionResult={executionResults[action.slug]}
                            />
                          </TabsContent>

                          <TabsContent value="execute" className="space-y-4">
                            {action.requestSchema?.properties ? (
                              <div className="space-y-4">
                                {Object.entries(action.requestSchema.properties).map(([paramName, paramDef]) => (
                                  <div key={paramName} className="space-y-2">
                                    <Label htmlFor={`${action.slug}-${paramName}`}>
                                      {paramName}
                                      {paramDef.required && <span className="text-destructive ml-1">*</span>}
                                    </Label>
                                    <Input
                                      id={`${action.slug}-${paramName}`}
                                      type={paramDef.type === 'number' ? 'number' : 'text'}
                                      placeholder={paramDef.default ? `Default: ${paramDef.default}` : `Enter ${paramName}...`}
                                      value={actionParameters[action.slug]?.[paramName] || ''}
                                      onChange={(e) => setActionParameters({
                                        ...actionParameters,
                                        [action.slug]: {
                                          ...(actionParameters[action.slug] || {}),
                                          [paramName]: e.target.value
                                        }
                                      })}
                                      required={paramDef.required}
                                    />
                                  </div>
                                ))}
                                <Button
                                  onClick={() => handleExecuteAction(action.slug)}
                                  disabled={executing === action.slug}
                                  className="w-full gap-2"
                                >
                                  {executing === action.slug ? (
                                    <>
                                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                                      Executing...
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4" />
                                      Execute Action
                                    </>
                                  )}
                                </Button>
                                {executionResults[action.slug] && (
                                  <div className="mt-4">
                                    <Label>Result</Label>
                                    <pre className="mt-2 p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto border">
                                      {JSON.stringify(executionResults[action.slug], null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-sm text-muted-foreground">No parameters required for this action</p>
                                <Button
                                  onClick={() => handleExecuteAction(action.slug)}
                                  disabled={executing === action.slug}
                                  className="mt-4 gap-2"
                                >
                                  {executing === action.slug ? (
                                    <>
                                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                                      Executing...
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4" />
                                      Execute Action
                                    </>
                                  )}
                                </Button>
                                {executionResults[action.slug] && (
                                  <div className="mt-4">
                                    <Label>Result</Label>
                                    <pre className="mt-2 p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto border">
                                      {JSON.stringify(executionResults[action.slug], null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  );
                  })}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">1</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Generate an API key from the <Button variant="link" className="p-0 h-auto" onClick={() => router.push(`/w/${workspaceSlug}/api-keys`)}>API Keys</Button> page
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">2</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Copy the endpoint and headers for the action you want to use
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">3</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use the endpoint in your application or workflow automation tools
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
