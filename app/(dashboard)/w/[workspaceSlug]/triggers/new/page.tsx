'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Zap } from 'lucide-react';

interface Connection {
  id: string;
  name: string;
  integration: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string;
  };
  workspace: {
    id: string;
  };
  project: {
    id: string;
  };
}

export default function CreateTriggerPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params?.workspaceSlug as string;

  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [triggerType, setTriggerType] = useState('new-sheet-row');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [calendarId, setCalendarId] = useState('primary');
  const [folderId, setFolderId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookMethod, setWebhookMethod] = useState<'POST' | 'PUT'>('POST');
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>([]);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/connections');
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedConnection = connections.find(c => c.id === connectionId);

  const getTriggerTypes = () => {
    if (!selectedConnection) return [];

    const slug = selectedConnection.integration.slug;

    if (slug === 'google-sheets') {
      return [
        { value: 'new-sheet-row', label: 'New Row Added' },
      ];
    }

    if (slug === 'google-calendar') {
      return [
        { value: 'new-calendar-event', label: 'New Event Created' },
      ];
    }

    if (slug === 'google-drive') {
      return [
        { value: 'new-drive-file', label: 'New File Added' },
      ];
    }

    return [];
  };

  const addCustomHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const removeCustomHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  const updateCustomHeader = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customHeaders];
    updated[index][field] = value;
    setCustomHeaders(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedConnection) {
      alert('Please select a connection');
      return;
    }

    setSubmitting(true);

    try {
      // Build config based on trigger type
      const config: any = {};

      if (triggerType === 'new-sheet-row') {
        config.spreadsheetId = spreadsheetId;
        config.sheetName = sheetName;
      } else if (triggerType === 'new-calendar-event') {
        config.calendarId = calendarId;
      } else if (triggerType === 'new-drive-file') {
        if (folderId) config.folderId = folderId;
      }

      // Build webhook headers
      const headers: Record<string, string> = {};
      customHeaders.forEach(header => {
        if (header.key && header.value) {
          headers[header.key] = header.value;
        }
      });

      const payload = {
        workspaceId: selectedConnection.workspace.id,
        projectId: selectedConnection.project.id,
        connectionId: selectedConnection.id,
        integrationId: selectedConnection.integration.id,
        name,
        description,
        triggerType,
        config,
        webhookUrl,
        webhookMethod,
        webhookHeaders: Object.keys(headers).length > 0 ? headers : undefined,
        isActive: true,
      };

      const res = await fetch('/api/triggers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create trigger');
      }

      // Success - redirect to triggers list
      router.push(`/w/${workspaceSlug}/triggers`);
    } catch (error) {
      console.error('Failed to create trigger:', error);
      alert(error instanceof Error ? error.message : 'Failed to create trigger');
    } finally {
      setSubmitting(false);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-8 py-8 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push(`/w/${workspaceSlug}/triggers`)}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Triggers
          </Button>

          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Create Trigger</h1>
              <p className="text-muted-foreground mt-1">
                Monitor events and send webhooks automatically
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="px-8 py-8 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Give your trigger a name and description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Trigger Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., New Sales Lead Added"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What does this trigger do?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Connection Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Connection</CardTitle>
                <CardDescription>Choose which connection to monitor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {connections.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg bg-muted/30">
                    <p className="text-muted-foreground mb-4">No connections found</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`/w/${workspaceSlug}/integrations`)}
                    >
                      Create Connection
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="connection">Connection *</Label>
                    <Select value={connectionId} onValueChange={setConnectionId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a connection" />
                      </SelectTrigger>
                      <SelectContent>
                        {connections.map((conn) => (
                          <SelectItem key={conn.id} value={conn.id}>
                            <div className="flex items-center gap-2">
                              <img
                                src={conn.integration.logoUrl}
                                alt={conn.integration.name}
                                className="w-4 h-4 object-contain"
                              />
                              {conn.name} ({conn.integration.name})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trigger Configuration */}
            {selectedConnection && (
              <Card>
                <CardHeader>
                  <CardTitle>Trigger Configuration</CardTitle>
                  <CardDescription>
                    Configure what event to monitor for {selectedConnection.integration.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="triggerType">Trigger Type *</Label>
                    <Select value={triggerType} onValueChange={setTriggerType} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getTriggerTypes().map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      ℹ️ We'll check every 5 minutes for new events
                    </p>
                  </div>

                  {/* Google Sheets specific */}
                  {triggerType === 'new-sheet-row' && (
                    <>
                      <div>
                        <Label htmlFor="spreadsheetId">Spreadsheet ID *</Label>
                        <Input
                          id="spreadsheetId"
                          placeholder="1nttsqgrf6nMlyfSMpZ..."
                          value={spreadsheetId}
                          onChange={(e) => setSpreadsheetId(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Found in the spreadsheet URL
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="sheetName">Sheet Name *</Label>
                        <Input
                          id="sheetName"
                          placeholder="Sheet1"
                          value={sheetName}
                          onChange={(e) => setSheetName(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Google Calendar specific */}
                  {triggerType === 'new-calendar-event' && (
                    <div>
                      <Label htmlFor="calendarId">Calendar ID</Label>
                      <Input
                        id="calendarId"
                        placeholder="primary"
                        value={calendarId}
                        onChange={(e) => setCalendarId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use "primary" for your main calendar
                      </p>
                    </div>
                  )}

                  {/* Google Drive specific */}
                  {triggerType === 'new-drive-file' && (
                    <div>
                      <Label htmlFor="folderId">Folder ID (optional)</Label>
                      <Input
                        id="folderId"
                        placeholder="Leave empty to monitor all files"
                        value={folderId}
                        onChange={(e) => setFolderId(e.target.value)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Webhook Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Webhook Configuration</CardTitle>
                <CardDescription>Where should we send the events?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="webhookUrl">Webhook URL *</Label>
                  <Input
                    id="webhookUrl"
                    type="url"
                    placeholder="https://myapp.com/webhooks/leads"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ⚠️ Make sure your endpoint can handle JSON POST requests
                  </p>
                </div>

                <div>
                  <Label htmlFor="webhookMethod">HTTP Method</Label>
                  <Select
                    value={webhookMethod}
                    onValueChange={(value) => setWebhookMethod(value as 'POST' | 'PUT')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Custom Headers (optional)</Label>
                  <div className="space-y-2 mt-2">
                    {customHeaders.map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Header name (e.g., X-API-Key)"
                          value={header.key}
                          onChange={(e) => updateCustomHeader(index, 'key', e.target.value)}
                        />
                        <Input
                          placeholder="Header value"
                          value={header.value}
                          onChange={(e) => updateCustomHeader(index, 'value', e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeCustomHeader(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomHeader}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Header
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/w/${workspaceSlug}/triggers`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !connectionId}>
                {submitting ? 'Creating...' : 'Create Trigger'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
