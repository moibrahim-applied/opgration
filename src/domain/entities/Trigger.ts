/**
 * Trigger Entity
 * Represents a trigger that monitors external events and forwards them to webhooks
 */
export interface Trigger {
  id: string;
  userId: string;
  workspaceId: string;
  projectId: string;
  connectionId: string;
  integrationId: string;

  // Trigger configuration
  name: string;
  description?: string;
  triggerType: string; // 'new-sheet-row', 'new-calendar-event', 'scheduled', etc.
  config: TriggerConfig; // Type-specific configuration

  // Webhook configuration
  webhookUrl: string;
  webhookHeaders?: Record<string, string>; // Custom headers to send
  webhookMethod: 'POST' | 'PUT'; // HTTP method for webhook

  // State and status
  isActive: boolean;
  lastCheckedAt?: Date;
  lastTriggeredAt?: Date;
  errorCount: number;
  lastError?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Trigger configuration - varies by trigger type
 */
export interface TriggerConfig {
  // For polling-based triggers
  pollInterval?: number; // in seconds

  // Google Sheets specific
  spreadsheetId?: string;
  sheetName?: string;

  // Google Calendar specific
  calendarId?: string;

  // Google Drive specific
  folderId?: string;
  fileType?: string;

  // Scheduled triggers
  schedule?: string; // cron expression
  timezone?: string;

  // Generic filters
  filters?: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'greaterThan' | 'lessThan';
    value: any;
  }>;
}

/**
 * Trigger Event Entity
 * Represents a single event that was triggered
 */
export interface TriggerEvent {
  id: string;
  triggerId: string;

  // Event data
  eventType: string;
  eventData: Record<string, any>;

  // Delivery status
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  statusMessage?: string;

  // Webhook delivery details
  webhookUrl: string;
  webhookMethod: string;
  webhookPayload: Record<string, any>;
  webhookResponse?: {
    statusCode: number;
    body: any;
    headers: Record<string, string>;
  };

  // Retry tracking
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt?: Date;

  // Timestamps
  createdAt: Date;
  deliveredAt?: Date;
  failedAt?: Date;
}

/**
 * Trigger State
 * Stores the current state for polling-based triggers
 */
export interface TriggerState {
  triggerId: string;
  lastItemId?: string; // Last row ID, file ID, etc.
  lastTimestamp?: Date;
  lastRowCount?: number;
  stateData: Record<string, any>; // Generic state storage
  updatedAt: Date;
}

/**
 * Input for creating a new trigger
 */
export interface CreateTriggerInput {
  userId: string;
  workspaceId: string;
  projectId: string;
  connectionId: string;
  integrationId: string;
  name: string;
  description?: string;
  triggerType: string;
  config: TriggerConfig;
  webhookUrl: string;
  webhookHeaders?: Record<string, string>;
  webhookMethod?: 'POST' | 'PUT';
  isActive?: boolean;
}

/**
 * Input for updating a trigger
 */
export interface UpdateTriggerInput {
  name?: string;
  description?: string;
  config?: TriggerConfig;
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
  webhookMethod?: 'POST' | 'PUT';
  isActive?: boolean;
}
