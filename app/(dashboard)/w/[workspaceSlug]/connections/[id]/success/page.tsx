'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle, Copy } from 'lucide-react';

interface Connection {
  id: string;
  name: string;
  organizationId: string;
  projectId: string;
  integration: {
    name: string;
    slug: string;
  };
  actions: Array<{
    name: string;
    slug: string;
    description: string;
  }>;
}

export default function ConnectionSuccessPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; id: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{ workspaceSlug: string; id: string } | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  if (!resolvedParams) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        </div>
      </div>
    );
  }

  return <ConnectionSuccessContent workspaceSlug={resolvedParams.workspaceSlug} connectionId={resolvedParams.id} />;
}

function ConnectionSuccessContent({
  workspaceSlug,
  connectionId,
}: {
  workspaceSlug: string;
  connectionId: string;
}) {
  const [copied, setCopied] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    fetchConnection();
  }, [connectionId]);

  const fetchConnection = async () => {
    try {
      const res = await fetch(`/api/connections/${connectionId}`);
      const data = await res.json();
      setConnection(data.connection);
    } catch (error) {
      console.error('Failed to fetch connection:', error);
    } finally {
      setLoading(false);
    }
  };

  // New clean API endpoint with headers
  const apiEndpoint = `${baseUrl}/api/execute/${connectionId}`;

  const firstAction = connection?.actions?.[0];
  const exampleAction = firstAction?.slug || 'action-slug';
  const examplePayload = firstAction
    ? getExamplePayload(connection.integration.slug, firstAction.slug)
    : '{"key": "value"}';

  const workspaceId = connection?.organizationId || 'your-workspace-id';
  const projectId = connection?.projectId || 'your-project-id';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  function getExamplePayload(integrationSlug: string, actionSlug: string): string {
    const examples: Record<string, Record<string, string>> = {
      'google-drive': {
        'create-folder': '{"folderName": "My Folder"}',
        'upload-file': '{"fileName": "document.pdf", "parentFolderId": "..."}',
      },
      'google-sheets': {
        'get-rows': '{"spreadsheetId": "...", "range": "Sheet1!A1:D10"}',
        'update-row': '{"spreadsheetId": "...", "range": "Sheet1!A2", "values": [["New Value"]]}',
        'append-row': '{"spreadsheetId": "...", "range": "Sheet1!A1", "values": [["Value1", "Value2"]]}',
      },
    };

    return examples[integrationSlug]?.[actionSlug] || '{"key": "value"}';
  }

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground">Connection Successful!</CardTitle>
            <CardDescription className="text-base mt-2">
              Your integration has been connected and is ready to use
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold mb-3 text-foreground">Your API Endpoint</h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-background border rounded-lg text-sm break-all font-mono">
                    {apiEndpoint}/[action-slug]
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(apiEndpoint)}
                    className="flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                {copied && (
                  <p className="text-xs text-primary mt-2 font-medium">✓ Copied to clipboard!</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-foreground">Example Usage</h3>
                <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto border">
{`curl -X POST ${apiEndpoint}/${exampleAction} \\
  -H "Content-Type: application/json" \\
  -H "X-Workspace-ID: ${workspaceId}" \\
  -H "X-Project-ID: ${projectId}" \\
  -H "X-API-Key: your-api-key" \\
  -d '${examplePayload}'`}
                </pre>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3 text-foreground">Next Steps</h3>
              <div className="space-y-2">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-primary">1</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Generate an API key from the API Keys page</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-primary">2</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Use your endpoint in workflow automation tools like Opus</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-primary">3</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Send JSON payloads to execute integration actions</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild className="flex-1" size="lg">
                <Link href={`/w/${workspaceSlug}/integrations`}>Back to Integrations</Link>
              </Button>
              <Button variant="outline" asChild className="flex-1" size="lg">
                <Link href={`/w/${workspaceSlug}/api-keys`}>Manage API Keys</Link>
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-1">Connection ID</p>
              <code className="text-sm font-mono text-foreground">{connectionId}</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}