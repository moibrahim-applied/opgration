export interface ApiLog {
  id: string;
  connectionId: string;
  actionId: string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  statusCode?: number;
  errorMessage?: string;
  executedAt: Date;
}