export interface ApiLog {
  id: string;
  connectionId: string;
  actionId: string | null;
  userId: string | null;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  statusCode?: number;
  errorMessage?: string;
  executedAt: Date;
}

export interface ApiLogWithDetails extends ApiLog {
  // Joined data from related tables
  connectionName?: string;
  actionName?: string;
  actionSlug?: string;
  integrationName?: string;
  integrationSlug?: string;
  userEmail?: string;
}

export interface ApiLogFilters {
  workspaceId?: string;
  projectId?: string;
  connectionId?: string;
  userId?: string;
  actionId?: string;
  statusCode?: number;
  startDate?: Date;
  endDate?: Date;
  hasError?: boolean;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'executedAt' | 'statusCode';
  sortOrder?: 'asc' | 'desc';
}