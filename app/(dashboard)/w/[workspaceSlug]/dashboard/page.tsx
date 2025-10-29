import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Network, Link2, Key, Zap, Plus, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get workspace
  const { data: workspace } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', workspaceSlug)
    .single();

  if (!workspace) {
    return null;
  }

  // Get stats
  const { count: connectionsCount } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', workspace.id)
    .eq('user_id', user.id);

  const { count: projectsCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', workspace.id);

  const { count: apiKeysCount } = await supabase
    .from('user_api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true);

  // Get recent connections
  const { data: recentConnections } = await supabase
    .from('connections')
    .select(`
      id,
      name,
      created_at,
      integrations(name, logo_url, icon_svg)
    `)
    .eq('organization_id', workspace.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-8 py-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your {workspace.name} workspace.
          </p>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Connections
              </CardTitle>
              <Link2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{connectionsCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Active integrations</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Projects
              </CardTitle>
              <Network className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{projectsCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">In this workspace</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                API Keys
              </CardTitle>
              <Key className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{apiKeysCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Active keys</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-secondary/50 transition-colors bg-gradient-to-br from-secondary/5 to-background">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status
              </CardTitle>
              <Zap className="w-4 h-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">Active</div>
              <p className="text-xs text-muted-foreground mt-1">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`/w/${workspaceSlug}/integrations`}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Plus className="w-4 h-4" />
                  Connect New Integration
                </Button>
              </Link>
              <Link href={`/w/${workspaceSlug}/api-keys`}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Key className="w-4 h-4" />
                  Generate API Key
                </Button>
              </Link>
              <Link href="/workspaces">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Network className="w-4 h-4" />
                  Manage Workspaces
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Connections</CardTitle>
                <Link href={`/w/${workspaceSlug}/connections`}>
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {!recentConnections || recentConnections.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">No connections yet</p>
                  <Link href={`/w/${workspaceSlug}/integrations`}>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Connect Your First Integration
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentConnections.map((connection: any) => (
                    <div
                      key={connection.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white border flex items-center justify-center flex-shrink-0">
                        <img
                          src={connection.integrations?.icon_svg || connection.integrations?.logo_url}
                          alt={connection.integrations?.name}
                          className="w-6 h-6 object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {connection.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(connection.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0">Active</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Getting Started (if no connections) */}
        {(!recentConnections || recentConnections.length === 0) && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Get Started
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Browse Integrations</h4>
                    <p className="text-sm text-muted-foreground">
                      Choose from available integrations like Google Sheets, Slack, and more.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Connect & Authenticate</h4>
                    <p className="text-sm text-muted-foreground">
                      Securely connect your account through OAuth or API keys.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Start Building</h4>
                    <p className="text-sm text-muted-foreground">
                      Use your API endpoints in your applications or automation tools.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
