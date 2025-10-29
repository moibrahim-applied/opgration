'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

export default function TestPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [connectionName, setConnectionName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
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

  const selectIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
    fetchActions(integration.id);
  };

  const handleCreateConnection = async () => {
    if (!selectedIntegration || !connectionName) {
      alert('Please enter a connection name');
      return;
    }

    setLoading(true);

    try {
      // Using test org/project UUIDs created in database
      // In production, user would select from their actual orgs/projects
      const res = await fetch('/api/auth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000001',
          projectId: '00000000-0000-0000-0000-000000000002',
          integrationId: selectedIntegration.id,
          connectionName,
        }),
      });

      const data = await res.json();

      if (data.authUrl) {
        // Redirect to OAuth
        window.location.href = data.authUrl;
      } else {
        alert('Error: ' + (data.error || 'Failed to initiate OAuth'));
      }
    } catch (error) {
      console.error('Failed to create connection:', error);
      alert('Failed to create connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Opgration Test Page</h1>

      {/* Integrations List */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Available Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <Card
              key={integration.id}
              className={`cursor-pointer transition-all ${
                selectedIntegration?.id === integration.id
                  ? 'ring-2 ring-blue-500'
                  : 'hover:shadow-lg'
              }`}
              onClick={() => selectIntegration(integration)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  {integration.logoUrl && (
                    <img
                      src={integration.logoUrl}
                      alt={integration.name}
                      className="w-12 h-12"
                    />
                  )}
                  <div>
                    <CardTitle>{integration.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {integration.authType}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{integration.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Selected Integration Details */}
      {selectedIntegration && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            {selectedIntegration.name} - Available Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {actions.map((action) => (
              <Card key={action.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{action.name}</CardTitle>
                  <CardDescription>
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {action.httpMethod}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      /{action.slug}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Create Connection Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create Connection</CardTitle>
              <CardDescription>
                Give this connection a name and authorize access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="connectionName">Connection Name</Label>
                  <Input
                    id="connectionName"
                    placeholder="e.g., My Google Drive"
                    value={connectionName}
                    onChange={(e) => setConnectionName(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreateConnection}
                  disabled={loading || !connectionName}
                  className="w-full"
                >
                  {loading ? 'Creating...' : `Connect to ${selectedIntegration.name}`}
                </Button>
                <p className="text-xs text-gray-500">
                  Note: You'll need to configure OAuth credentials in .env.local first
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}