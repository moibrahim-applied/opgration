import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Network, Link2, Key, Zap, Plus, TrendingUp, ArrowRight, Blocks, FolderKanban, Sparkles } from 'lucide-react';
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
      {/* Hero Header */}
      <div className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5">
        <div className="px-6 py-10 max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-3">
                Welcome lara! 👋
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                {workspace.name} workspace • Manage your integrations, connections, and API keys all in one place.
              </p>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1 bg-green-100 text-green-800 border-green-200">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              All Systems Operational
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 max-w-7xl mx-auto space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2 hover:shadow-lg transition-all cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Active Connections</p>
                  <p className="text-3xl font-bold text-foreground">{connectionsCount || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Link2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-all cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Projects</p>
                  <p className="text-3xl font-bold text-foreground">{projectsCount || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FolderKanban className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-all cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Active API Keys</p>
                  <p className="text-3xl font-bold text-foreground">{apiKeysCount || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Key className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Setup Integration Card */}
            <Link href={`/w/${workspaceSlug}/integrations`} className="group">
              <Card className="border-2 hover:border-primary hover:shadow-lg transition-all cursor-pointer h-full">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Network className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">Setup Integration</CardTitle>
                  <CardDescription>
                    Connect to Google Sheets, Drive, Calendar and more
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-primary font-medium text-sm group-hover:gap-2 transition-all">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Generate API Key Card */}
            <Link href={`/w/${workspaceSlug}/api-keys`} className="group">
              <Card className="border-2 hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer h-full">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Key className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">Generate API Key</CardTitle>
                  <CardDescription>
                    Create secure API keys for your applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-amber-600 font-medium text-sm group-hover:gap-2 transition-all">
                    Create Key
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Create Project Card */}
            <Link href={`/w/${workspaceSlug}/settings`} className="group">
              <Card className="border-2 hover:border-purple-500 hover:shadow-lg transition-all cursor-pointer h-full">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FolderKanban className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">Create New Project</CardTitle>
                  <CardDescription>
                    Organize your integrations into projects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-purple-600 font-medium text-sm group-hover:gap-2 transition-all">
                    New Project
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Recent Activity & Getting Started */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Connections */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-primary" />
                    Recent Connections
                  </CardTitle>
                  <CardDescription className="mt-1">Your latest connected integrations</CardDescription>
                </div>
                <Link href={`/w/${workspaceSlug}/connections`}>
                  <Button variant="ghost" size="sm" className="text-primary">
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {!recentConnections || recentConnections.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <Link2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-2">No connections yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Get started by connecting your first integration</p>
                  <Link href={`/w/${workspaceSlug}/integrations`}>
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Connect Integration
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentConnections.map((connection: any) => (
                    <Link
                      key={connection.id}
                      href={`/w/${workspaceSlug}/connections/${connection.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border-2 hover:border-primary hover:shadow-md transition-all group"
                    >
                      <div className="w-12 h-12 rounded-lg bg-white border flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <img
                          src={connection.integrations?.icon_svg || connection.integrations?.logo_url}
                          alt={connection.integrations?.name}
                          className="w-7 h-7 object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {connection.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(connection.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0 bg-green-100 text-green-800 border-green-200">
                        Active
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Getting Started Guide */}
          <Card className="border-2 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Getting Started
              </CardTitle>
              <CardDescription className="mt-1">Follow these steps to get up and running</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Browse Integrations</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Explore our integration catalog and find the apps you need
                    </p>
                    <Link href={`/w/${workspaceSlug}/integrations`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        View Integrations
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Connect & Authenticate</h4>
                    <p className="text-sm text-muted-foreground">
                      Securely connect your accounts using OAuth or API keys
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Start Building</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Use your API keys to integrate with your applications
                    </p>
                    <Link href={`/w/${workspaceSlug}/api-keys`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        Generate API Key
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
