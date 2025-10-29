'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Zap, CheckCircle } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  iconSvg?: string;
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
  isActive: boolean;
}

export default function IntegrationActionsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchIntegrationAndActions();
      fetchExistingConnections();
    }
  }, [slug]);

  const fetchIntegrationAndActions = async () => {
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      const found = data.integrations?.find((i: Integration) => i.slug === slug);

      if (found) {
        setIntegration(found);
        fetchActions(found.id);
      }
    } catch (error) {
      console.error('Failed to fetch integration:', error);
    }
  };

  const fetchActions = async (integrationId: string) => {
    try {
      const res = await fetch(`/api/integrations/${integrationId}/actions`);
      const data = await res.json();
      setActions(data.actions || []);
    } catch (error) {
      console.error('Failed to fetch actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingConnections = async () => {
    try {
      // TODO: Fetch user's existing connections for this integration
      setConnections([]);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    }
  };

  const handleActionClick = (actionSlug: string) => {
    // Navigate to action setup page
    router.push(`/integrations/${slug}/actions/${actionSlug}/setup`);
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-500',
      POST: 'bg-green-500',
      PUT: 'bg-yellow-500',
      PATCH: 'bg-orange-500',
      DELETE: 'bg-red-500',
    };
    return colors[method] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading actions...</p>
        </div>
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Integration not found</p>
          <Button onClick={() => router.push('/integrations')}>
            Back to Integrations
          </Button>
        </div>
      </div>
    );
  }

  const iconUrl = integration.iconSvg || integration.logoUrl;
  const hasActiveConnection = connections.some(c => c.isActive);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-8 py-8 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/integrations')}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Integrations
          </Button>

          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shadow-lg border">
              <img src={iconUrl} alt={integration.name} className="w-14 h-14 object-contain" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{integration.name}</h1>
                {hasActiveConnection && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Connected
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-lg mb-4">{integration.description}</p>
              <p className="text-sm text-muted-foreground">
                Select an action below to configure and generate your API endpoint
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Grid */}
      <div className="px-8 py-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Available Actions</h2>
          <p className="text-sm text-muted-foreground">
            Click on any action to configure it and get your API endpoint
          </p>
        </div>

        {actions.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground">No actions available for this integration</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {actions.map((action) => (
              <Card
                key={action.id}
                className="hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer group"
                onClick={() => handleActionClick(action.slug)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <Badge variant="outline" className={`${getMethodColor(action.httpMethod)} text-white text-xs`}>
                      {action.httpMethod}
                    </Badge>
                  </div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors">
                    {action.name}
                  </CardTitle>
                  <CardDescription className="text-sm line-clamp-2">
                    {action.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
