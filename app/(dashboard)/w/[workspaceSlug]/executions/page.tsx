'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';

interface Execution {
  id: string;
  connectionId: string;
  actionId: string | null;
  userId: string | null;
  statusCode: number;
  errorMessage: string | null;
  executedAt: string;
  connectionName?: string;
  actionName?: string;
  integrationName?: string;
  integrationSlug?: string;
  requestPayload?: Record<string, any>;
  responsePayload?: Record<string, any>;
}

export default function ExecutionsPage() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;

  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);

  useEffect(() => {
    fetchExecutions();
  }, [offset]);

  const fetchExecutions = async () => {
    try {
      setLoading(true);

      // Get workspace ID from slug
      const workspacesRes = await fetch('/api/workspaces');
      const workspacesData = await workspacesRes.json();
      const workspace = workspacesData.workspaces?.find((w: any) => w.slug === workspaceSlug);

      if (!workspace) {
        console.error('Workspace not found');
        return;
      }

      const res = await fetch(
        `/api/workspaces/${workspace.id}/executions?limit=${limit}&offset=${offset}`
      );

      if (!res.ok) {
        throw new Error('Failed to fetch executions');
      }

      const data = await res.json();
      setExecutions(data.executions || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (statusCode: number, errorMessage: string | null) => {
    if (errorMessage || statusCode >= 400) {
      return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
    }
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge variant="default" className="flex items-center gap-1 bg-green-600"><CheckCircle className="h-3 w-3" /> Success</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading && executions.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Execution History</h1>
        </div>
        <p>Loading executions...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Execution History</h1>
          <Badge variant="secondary">{total} total</Badge>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Executions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Executions</CardTitle>
          </CardHeader>
          <CardContent>
            {executions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No executions yet</p>
                <p className="text-sm mt-2">Execute an action to see it appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="pb-3 px-4">Time</th>
                      <th className="pb-3 px-4">Integration</th>
                      <th className="pb-3 px-4">Action</th>
                      <th className="pb-3 px-4">Connection</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map((execution) => (
                      <tr
                        key={execution.id}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedExecution(execution)}
                      >
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {formatDate(execution.executedAt)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">{execution.integrationName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {execution.actionName}
                          </code>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {execution.connectionName}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(execution.statusCode, execution.errorMessage)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {total > limit && (
              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution Details Panel */}
        {selectedExecution && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">Execution Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedExecution(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-1">
                    {getStatusBadge(selectedExecution.statusCode, selectedExecution.errorMessage)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status Code</p>
                  <p className="font-mono mt-1">{selectedExecution.statusCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Executed At</p>
                  <p className="mt-1">{new Date(selectedExecution.executedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Connection</p>
                  <p className="mt-1">{selectedExecution.connectionName}</p>
                </div>
              </div>

              {selectedExecution.errorMessage && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Error Message</p>
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                    {selectedExecution.errorMessage}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-2">Request Payload</p>
                <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto">
                  {JSON.stringify(selectedExecution.requestPayload, null, 2)}
                </pre>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Response</p>
                <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto max-h-96">
                  {JSON.stringify(selectedExecution.responsePayload, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
