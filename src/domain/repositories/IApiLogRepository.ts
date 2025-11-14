import { ApiLog, ApiLogWithDetails, ApiLogFilters, PaginationOptions } from '../entities';

export interface IApiLogRepository {
  /**
   * Find logs by workspace (organization) with optional filters and pagination
   */
  findByWorkspace(
    workspaceId: string,
    filters?: ApiLogFilters,
    pagination?: PaginationOptions
  ): Promise<{ logs: ApiLogWithDetails[]; total: number }>;

  /**
   * Find logs by connection ID
   */
  findByConnection(connectionId: string, pagination?: PaginationOptions): Promise<ApiLogWithDetails[]>;

  /**
   * Find logs by user ID
   */
  findByUser(userId: string, pagination?: PaginationOptions): Promise<ApiLogWithDetails[]>;

  /**
   * Find a single log by ID with details
   */
  findById(id: string): Promise<ApiLogWithDetails | null>;

  /**
   * Get execution statistics for a workspace
   */
  getWorkspaceStats(workspaceId: string, startDate?: Date, endDate?: Date): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    mostUsedActions: Array<{ actionName: string; count: number }>;
  }>;
}
