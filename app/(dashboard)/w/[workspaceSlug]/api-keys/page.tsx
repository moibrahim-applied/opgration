'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Copy, Trash2, AlertCircle } from 'lucide-react';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    const res = await fetch('/api/user/api-keys');
    const data = await res.json();
    setKeys(data.keys || []);
  };

  const generateKey = async () => {
    if (!newKeyName) {
      alert('Enter a name for the key');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName }),
    });

    const data = await res.json();
    setGeneratedKey(data.apiKey);
    setNewKeyName('');
    setLoading(false);
    fetchKeys();
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Revoke this API key?')) return;

    await fetch(`/api/user/api-keys/${id}`, { method: 'DELETE' });
    fetchKeys();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-8 py-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
              <p className="text-muted-foreground mt-1">Manage authentication keys for API access</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">
        {/* Generated Key Alert */}
        {generatedKey && (
          <div className="mb-6 border-2 border-primary rounded-lg bg-primary/5 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg mb-1">API Key Generated Successfully</h3>
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Copy this key now! You won't be able to see it again.
                </p>
              </div>
            </div>
            <div className="bg-background border rounded-lg p-4 mb-4">
              <code className="block text-sm break-all font-mono text-foreground">
                {generatedKey}
              </code>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey);
                  alert('Copied to clipboard!');
                }}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Key
              </Button>
              <Button
                variant="outline"
                onClick={() => setGeneratedKey('')}
              >
                Done
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Create New Key */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Create New Key</CardTitle>
                <CardDescription>Generate a new API key for authentication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Production, Development"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Choose a descriptive name to identify this key
                  </p>
                </div>
                <Button
                  onClick={generateKey}
                  disabled={loading || !newKeyName.trim()}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Generating...' : 'Generate Key'}
                </Button>
              </CardContent>
            </Card>

            {/* Usage Instructions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">How to Use</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Include your API key in the <code className="text-xs bg-muted px-1 py-0.5 rounded">X-API-Key</code> header:
                </p>
                <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto">
{`curl -X POST \\
  https://api.opgration.com/execute/... \\
  -H "X-API-Key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"param": "value"}'`}
                </pre>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - API Keys List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Active API Keys</CardTitle>
                <CardDescription>
                  {keys.length === 0
                    ? 'No API keys yet. Create one to get started.'
                    : `You have ${keys.length} active ${keys.length === 1 ? 'key' : 'keys'}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {keys.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Key className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No API keys yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Create your first key to start using the API</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {keys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-foreground">{key.name}</p>
                            <Badge variant={key.is_active ? "default" : "secondary"} className="text-xs">
                              {key.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                            {key.key_prefix}
                          </code>
                          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                            <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                            {key.last_used_at && (
                              <span>• Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteKey(key.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}