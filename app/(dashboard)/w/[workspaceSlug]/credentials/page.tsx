'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface Credential {
  id: string;
  name: string;
  integration: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string;
    iconSvg?: string;
  };
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export default function CredentialsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params?.workspaceSlug as string;

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const res = await fetch('/api/connections');
      const data = await res.json();

      const transformedCredentials = (data.connections || []).map((conn: any) => ({
        id: conn.id,
        name: conn.name,
        integration: {
          id: conn.integrations?.id || conn.integration?.id,
          name: conn.integrations?.name || conn.integration?.name,
          slug: conn.integrations?.slug || conn.integration?.slug,
          logoUrl: conn.integrations?.logo_url || conn.integration?.logoUrl,
          iconSvg: conn.integrations?.icon_svg || conn.integration?.icon_svg,
        },
        isActive: conn.is_active || conn.isActive,
        createdAt: conn.created_at || conn.createdAt,
        lastUsedAt: conn.last_used_at || conn.lastUsedAt,
      }));

      setCredentials(transformedCredentials);
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credential? This cannot be undone.')) {
      return;
    }

    try {
      await fetch(`/api/connections/${id}`, { method: 'DELETE' });
      fetchCredentials();
    } catch (error) {
      console.error('Failed to delete credential:', error);
      alert('Failed to delete credential');
    }
  };

  const handleReAuthenticate = (credential: Credential) => {
    // Navigate to integration setup to re-authenticate
    router.push(`/w/${workspaceSlug}/integrations/${credential.integration.slug}`);
  };

  const groupedCredentials = credentials.reduce((acc, cred) => {
    const serviceName = cred.integration.name;
    if (!acc[serviceName]) {
      acc[serviceName] = [];
    }
    acc[serviceName].push(cred);
    return acc;
  }, {} as Record<string, Credential[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-8 py-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Credentials</h1>
                <p className="text-muted-foreground mt-1">Manage your service authentication credentials</p>
              </div>
            </div>
            <Button onClick={() => router.push(`/w/${workspaceSlug}/integrations`)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Credential
            </Button>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">
        {credentials.length === 0 ? (
          /* Empty State */
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Key className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No credentials yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Connect your first service to start managing credentials. Each service can have one credential per project.
              </p>
              <Button onClick={() => router.push(`/w/${workspaceSlug}/integrations`)} size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                Connect Your First Service
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Credentials List - Grouped by Service */
          <div className="space-y-6">
            {Object.entries(groupedCredentials).map(([serviceName, creds]) => {
              const firstCred = creds[0];
              const iconUrl = firstCred.integration.iconSvg || firstCred.integration.logoUrl;

              return (
                <Card key={serviceName}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-white border shadow-sm flex items-center justify-center">
                        <img src={iconUrl} alt={serviceName} className="w-10 h-10 object-contain" />
                      </div>
                      <div className="flex-1">
                        <CardTitle>{serviceName}</CardTitle>
                        <CardDescription>
                          {creds.length} {creds.length === 1 ? 'credential' : 'credentials'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {creds.map((credential) => (
                        <div
                          key={credential.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-foreground">{credential.name}</p>
                              <Badge variant={credential.isActive ? "default" : "secondary"} className="gap-1">
                                {credential.isActive ? (
                                  <>
                                    <CheckCircle className="w-3 h-3" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3 h-3" />
                                    Inactive
                                  </>
                                )}
                              </Badge>
                            </div>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>Created {new Date(credential.createdAt).toLocaleDateString()}</span>
                              {credential.lastUsedAt && (
                                <span>• Last used {new Date(credential.lastUsedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/w/${workspaceSlug}/connections/${credential.id}`)}
                              className="gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReAuthenticate(credential)}
                              className="gap-2"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Re-auth
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(credential.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Card */}
        {credentials.length > 0 && (
          <Card className="mt-6 bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">About Credentials</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Each project can have <strong>one credential per service</strong></span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>All actions for a service will use the project's credential automatically</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Use "Re-auth" to refresh expired credentials without losing configuration</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Deleting a credential will affect all actions using that service</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
