import { SupabaseClient } from '@supabase/supabase-js';
import {
  ApiLogWithDetails,
  ApiLogFilters,
  PaginationOptions,
  IApiLogRepository
} from '@/src/domain';

export class SupabaseApiLogRepository implements IApiLogRepository {
  constructor(private supabase: SupabaseClient) {}

  async findByWorkspace(
    workspaceId: string,
    filters?: ApiLogFilters,
    pagination?: PaginationOptions
  ): Promise<{ logs: ApiLogWithDetails[]; total: number }> {
    const limit = pagination?.limit || 50;
    const offset = pagination?.offset || 0;
    const sortBy = pagination?.sortBy || 'executedAt';
    const sortOrder = pagination?.sortOrder || 'desc';

    // Build the query
    let query = this.supabase
      .from('api_logs')
      .select(`
        *,
        connections!inner (
          id,
          name,
          organization_id,
          project_id,
          integration_id,
          integrations (
            name,
            slug
          )
        ),
        integration_actions (
          name,
          slug
        )
      `, { count: 'exact' });

    // Filter by workspace through connections
    query = query.eq('connections.organization_id', workspaceId);

    // Apply additional filters
    if (filters?.projectId) {
      query = query.eq('connections.project_id', filters.projectId);
    }
    if (filters?.connectionId) {
      query = query.eq('connection_id', filters.connectionId);
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.actionId) {
      query = query.eq('action_id', filters.actionId);
    }
    if (filters?.statusCode) {
      query = query.eq('status_code', filters.statusCode);
    }
    if (filters?.hasError !== undefined) {
      if (filters.hasError) {
        query = query.not('error_message', 'is', null);
      } else {
        query = query.is('error_message', null);
      }
    }
    if (filters?.startDate) {
      query = query.gte('executed_at', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('executed_at', filters.endDate.toISOString());
    }

    // Apply sorting and pagination
    const dbSortBy = sortBy === 'executedAt' ? 'executed_at' : 'status_code';
    query = query
      .order(dbSortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const logs = (data || []).map(this.mapToApiLogWithDetails);

    return {
      logs,
      total: count || 0
    };
  }

  async findByConnection(
    connectionId: string,
    pagination?: PaginationOptions
  ): Promise<ApiLogWithDetails[]> {
    const limit = pagination?.limit || 50;
    const offset = pagination?.offset || 0;
    const sortBy = pagination?.sortBy || 'executedAt';
    const sortOrder = pagination?.sortOrder || 'desc';

    const dbSortBy = sortBy === 'executedAt' ? 'executed_at' : 'status_code';

    const { data, error } = await this.supabase
      .from('api_logs')
      .select(`
        *,
        connections (
          name,
          integrations (
            name,
            slug
          )
        ),
        integration_actions (
          name,
          slug
        )
      `)
      .eq('connection_id', connectionId)
      .order(dbSortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return (data || []).map(this.mapToApiLogWithDetails);
  }

  async findByUser(
    userId: string,
    pagination?: PaginationOptions
  ): Promise<ApiLogWithDetails[]> {
    const limit = pagination?.limit || 50;
    const offset = pagination?.offset || 0;
    const sortBy = pagination?.sortBy || 'executedAt';
    const sortOrder = pagination?.sortOrder || 'desc';

    const dbSortBy = sortBy === 'executedAt' ? 'executed_at' : 'status_code';

    const { data, error } = await this.supabase
      .from('api_logs')
      .select(`
        *,
        connections (
          name,
          integrations (
            name,
            slug
          )
        ),
        integration_actions (
          name,
          slug
        )
      `)
      .eq('user_id', userId)
      .order(dbSortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return (data || []).map(this.mapToApiLogWithDetails);
  }

  async findById(id: string): Promise<ApiLogWithDetails | null> {
    const { data, error } = await this.supabase
      .from('api_logs')
      .select(`
        *,
        connections (
          name,
          integrations (
            name,
            slug
          )
        ),
        integration_actions (
          name,
          slug
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToApiLogWithDetails(data);
  }

  async getWorkspaceStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    mostUsedActions: Array<{ actionName: string; count: number }>;
  }> {
    // Build base query
    let query = this.supabase
      .from('api_logs')
      .select(`
        id,
        status_code,
        error_message,
        action_id,
        integration_actions (name),
        connections!inner (organization_id)
      `)
      .eq('connections.organization_id', workspaceId);

    if (startDate) {
      query = query.gte('executed_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('executed_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const totalExecutions = data?.length || 0;
    const successfulExecutions = data?.filter(log =>
      log.status_code >= 200 && log.status_code < 300
    ).length || 0;
    const failedExecutions = data?.filter(log =>
      log.status_code >= 400 || log.error_message
    ).length || 0;

    // Calculate most used actions
    const actionCounts: Record<string, number> = {};
    data?.forEach(log => {
      const actionName = (log.integration_actions as any)?.name || 'Unknown';
      actionCounts[actionName] = (actionCounts[actionName] || 0) + 1;
    });

    const mostUsedActions = Object.entries(actionCounts)
      .map(([actionName, count]) => ({ actionName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      mostUsedActions
    };
  }

  private mapToApiLogWithDetails(data: any): ApiLogWithDetails {
    return {
      id: data.id,
      connectionId: data.connection_id,
      actionId: data.action_id,
      userId: data.user_id,
      requestPayload: data.request_payload || {},
      responsePayload: data.response_payload || {},
      statusCode: data.status_code || 0,
      errorMessage: data.error_message,
      executedAt: new Date(data.executed_at),
      connectionName: data.connections?.name,
      integrationName: data.connections?.integrations?.name,
      integrationSlug: data.connections?.integrations?.slug,
      actionName: data.integration_actions?.name,
      actionSlug: data.integration_actions?.slug
    };
  }
}
