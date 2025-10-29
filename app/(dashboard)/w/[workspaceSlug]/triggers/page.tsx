'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Zap,
  Plus,
  Search,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface Trigger {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  webhookUrl: string;
  isActive: boolean;
  lastCheckedAt?: string;
  lastTriggeredAt?: string;
  errorCount: number;
  lastError?: string;
  createdAt: string;
  integration: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string;
  };
  connection: {
    id: string;
    name: string;
  };
}

export default function TriggersPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params?.workspaceSlug as string;

  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTriggers();
  }, []);

  const fetchTriggers = async () => {
    try {
      const res = await fetch('/api/triggers');
      const data = await res.json();
      setTriggers(data.triggers || []);
    } catch (error) {
      console.error('Failed to fetch triggers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrigger = async (triggerId: string, currentState: boolean) => {
    try {
      await fetch(`/api/triggers/${triggerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentState }),
      });

      // Refresh triggers
      await fetchTriggers();
    } catch (error) {
      console.error('Failed to toggle trigger:', error);
    }
  };

  const deleteTrigger = async (triggerId: string, triggerName: string) => {
    if (!confirm(`Are you sure you want to delete "${triggerName}"?`)) {
      return;
    }

    try {
      await fetch(`/api/triggers/${triggerId}`, {
        method: 'DELETE',
      });

      // Refresh triggers
      await fetchTriggers();
    } catch (error) {
      console.error('Failed to delete trigger:', error);
    }
  };

  const filteredTriggers = triggers.filter(
    (trigger) =>
      trigger.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trigger.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTriggerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'new-sheet-row': 'New Sheet Row',
      'new-calendar-event': 'New Calendar Event',
      'new-drive-file': 'New Drive File',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (trigger: Trigger) => {
    if (!trigger.isActive) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Pause className="w-3 h-3" />
          Paused
        </Badge>
      );
    }

    if (trigger.errorCount > 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          {trigger.errorCount} {trigger.errorCount === 1 ? 'Error' : 'Errors'}
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="gap-1 bg-green-500">
        <CheckCircle2 className="w-3 h-3" />
        Active
      </Badge>
    );
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading triggers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-8 py-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Zap className="w-8 h-8 text-primary" />
                Triggers
              </h1>
              <p className="text-muted-foreground mt-2">
                Automate workflows by monitoring events and sending webhooks
              </p>
            </div>
            <Button
              onClick={() => router.push(`/w/${workspaceSlug}/triggers/new`)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Trigger
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search triggers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8 max-w-7xl mx-auto">
        {filteredTriggers.length === 0 ? (
          <Card>
            <CardContent className="py-20">
              <div className="text-center">
                <Zap className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchQuery ? 'No triggers found' : 'No triggers yet'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Create your first trigger to start automating workflows'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => router.push(`/w/${workspaceSlug}/triggers/new`)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Trigger
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredTriggers.map((trigger) => (
              <Card key={trigger.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-start gap-4 mb-4">
                        {/* Integration Icon */}
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow border flex-shrink-0">
                          <img
                            src={trigger.integration?.logoUrl || '/placeholder.svg'}
                            alt={trigger.integration?.name}
                            className="w-8 h-8 object-contain"
                          />
                        </div>

                        {/* Title & Description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold text-foreground truncate">
                              {trigger.name}
                            </h3>
                            {getStatusBadge(trigger)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {getTriggerTypeLabel(trigger.triggerType)} • {trigger.connection?.name || 'Connection'}
                          </p>
                          {trigger.description && (
                            <p className="text-sm text-muted-foreground">{trigger.description}</p>
                          )}

                          {/* Error Message */}
                          {trigger.lastError && (
                            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                              <div className="flex items-start gap-2">
                                <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-destructive">{trigger.lastError}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Checked: {formatTimestamp(trigger.lastCheckedAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          <span>Fired: {formatTimestamp(trigger.lastTriggeredAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          <a
                            href={trigger.webhookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary truncate max-w-xs"
                          >
                            {new URL(trigger.webhookUrl).hostname}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/w/${workspaceSlug}/triggers/${trigger.id}`)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleTrigger(trigger.id, trigger.isActive)}
                      >
                        {trigger.isActive ? (
                          <>
                            <Pause className="w-4 h-4 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteTrigger(trigger.id, trigger.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
