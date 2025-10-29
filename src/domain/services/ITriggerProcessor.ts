import { Trigger, TriggerEvent } from '../entities/Trigger';

/**
 * Trigger Processor Interface
 * Defines the contract for processing and executing triggers
 */
export interface ITriggerProcessor {
  /**
   * Process all active triggers that are due for checking
   */
  processActiveTriggers(): Promise<void>;

  /**
   * Process a single trigger
   */
  processTrigger(trigger: Trigger): Promise<void>;

  /**
   * Check for new events for a specific trigger type
   */
  checkForEvents(trigger: Trigger): Promise<any[]>;

  /**
   * Fire a trigger event (send webhook)
   */
  fireEvent(trigger: Trigger, eventData: any): Promise<TriggerEvent>;

  /**
   * Deliver a webhook
   */
  deliverWebhook(event: TriggerEvent): Promise<{
    success: boolean;
    statusCode: number;
    response: any;
    error?: string;
  }>;

  /**
   * Retry failed events
   */
  retryFailedEvents(): Promise<void>;
}

/**
 * Trigger Type Handler Interface
 * Each trigger type (new-sheet-row, new-calendar-event) implements this
 */
export interface ITriggerTypeHandler {
  /**
   * The trigger type this handler supports
   */
  readonly triggerType: string;

  /**
   * Check for new events
   */
  checkForEvents(trigger: Trigger, lastState?: any): Promise<{
    events: any[];
    newState: any;
  }>;

  /**
   * Transform raw event data into webhook payload
   */
  transformEventData(trigger: Trigger, eventData: any): Record<string, any>;

  /**
   * Validate trigger configuration
   */
  validateConfig(config: any): { valid: boolean; errors?: string[] };
}
