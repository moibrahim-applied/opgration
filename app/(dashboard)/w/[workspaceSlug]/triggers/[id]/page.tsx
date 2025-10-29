'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Edit,
  Trash2,
  Zap,
  TrendingUp,
  Activity,
} from 'lucide-react';

interface TriggerEvent {
  id: string;
  eventType: string;
  eventData: any;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  statusMessage?: string;
  webhookUrl: string;
  webhookResponse?: {
    statusCode: number;
    body: any;
  };
  attemptCount: number;
  createdAt: string;
  deliveredAt?: string;
}

interface Trigger {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  config: any;
  webhookUrl: string;
  webhookMethod: string;
  webhookHeaders?: Record<string, string>;
  isActive: boolean;
  lastCheckedAt?: string;
  lastTriggeredAt?: string;
  errorCount: number;
  lastError?: string;
  createdAt: string;
  integration: {
    name: string;
    slug: string;
    logoUrl: string;
  };
  connection: {
    name: string;
  };
}

interface Stats {
  totalEvents: number;
  deliveredEvents: number;
  failedEvents: number;
  pendingEvents: number;
  avgDeliveryTime: number;
}

export default function TriggerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params?.workspaceSlug as string;
  const triggerId = params?.id as string;

  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [events, setEvents] = useState<TriggerEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [triggerId]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchTrigger(),
        fetchEvents(),
        fetchStats(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrigger = async () => {
    try {
      const res = await fetch(`/api/triggers/${triggerId}`);
      const data = await res.json();
      setTrigger(data.trigger);
    } catch (error) {
      console.error('Failed to fetch trigger:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(`/api/triggers/${triggerId}/events?limit=50`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/triggers/${triggerId}/stats`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const deleteTrigger = async () => {
    if (!trigger) return;

    if (!confirm(`Are you sure you want to delete "${trigger.name}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      await fetch(`/api/triggers/${triggerId}`, {
        method: 'DELETE',
      });

      router.push(`/w/${workspaceSlug}/triggers`);
    } catch (error) {
      console.error('Failed to delete trigger:', error);
      alert('Failed to delete trigger');
    } finally {
      setDeleting(false);
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatTimeAgo = (timestamp?: string) => {
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

  const getStatusBadge = (status: TriggerEvent['status']) => {
    switch (status) {
      case 'delivered':
        return (
          <Badge variant="default" className="bg-green-500 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Delivered
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Failed
          </Badge>
        );
      case 'retrying':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            Retrying
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
    }
  };

  const getSuccessRate = () => {
    if (!stats || stats.totalEvents === 0) return 0;
    return Math.round((stats.deliveredEvents / stats.totalEvents) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading trigger details...</p>
        </div>
      </div>
    );
  }

  if (!trigger) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Trigger not found</p>
          <Button onClick={() => router.push(`/w/${workspaceSlug}/triggers`)}>
            Back to Triggers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-8 py-8 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push(`/w/${workspaceSlug}/triggers`)}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Triggers
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Integration Icon */}
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg border">
                <img
                  src={trigger.integration.logoUrl}
                  alt={trigger.integration.name}
                  className="w-12 h-12 object-contain"
                />
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-foreground">{trigger.name}</h1>
                  {trigger.isActive ? (
                    <Badge variant="default" className="bg-green-500 gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Paused
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{trigger.description || 'No description'}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{trigger.integration.name}</span>
                  <span>•</span>
                  <span>{trigger.connection.name}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteTrigger}
                disabled={deleting}
                className="gap-2"
              >
                {deleting ? (
                  'Deleting...'
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8 max-w-7xl mx-auto">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2">
              <Zap className="w-4 h-4" />
              Event History ({events.length})
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              Configuration
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">{stats?.deliveredEvents || 0}</div>
                  <p className="text-sm text-muted-foreground">Delivered</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">{stats?.failedEvents || 0}</div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold">{getSuccessRate()}%</div>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Status Info */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trigger Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Checked:</span>
                    <span className="font-medium">{formatTimeAgo(trigger.lastCheckedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Triggered:</span>
                    <span className="font-medium">{formatTimeAgo(trigger.lastTriggeredAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Error Count:</span>
                    <span className="font-medium">{trigger.errorCount}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Webhook Endpoint</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{trigger.webhookMethod}</Badge>
                    <a
                      href={trigger.webhookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline truncate"
                    >
                      {trigger.webhookUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Error Message */}
            {trigger.lastError && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-base text-destructive flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Last Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{trigger.lastError}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            {events.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No events yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Events will appear here when the trigger detects changes
                  </p>
                </CardContent>
              </Card>
            ) : (
              events.map((event) => (
                <Card key={event.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(event.status)}
                        <div>
                          <div className="font-medium">Event #{event.id.slice(0, 8)}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatTimestamp(event.createdAt)}
                          </div>
                        </div>
                      </div>

                      {event.webhookResponse && (
                        <Badge variant={event.webhookResponse.statusCode === 200 ? 'default' : 'destructive'}>
                          HTTP {event.webhookResponse.statusCode}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Event Data</h4>
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                          {JSON.stringify(event.eventData, null, 2)}
                        </pre>
                      </div>

                      {event.webhookResponse && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Webhook Response</h4>
                          <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                            {JSON.stringify(event.webhookResponse.body, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {event.statusMessage && (
                      <p className="text-sm text-muted-foreground mt-3">
                        {event.statusMessage}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trigger Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                  {JSON.stringify(
                    {
                      type: trigger.triggerType,
                      config: trigger.config,
                      webhook: {
                        url: trigger.webhookUrl,
                        method: trigger.webhookMethod,
                        headers: trigger.webhookHeaders,
                      },
                    },
                    null,
                    2
                  )}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
