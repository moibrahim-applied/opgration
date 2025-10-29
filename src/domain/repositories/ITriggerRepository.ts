import {
  Trigger,
  TriggerEvent,
  TriggerState,
  CreateTriggerInput,
  UpdateTriggerInput,
} from '../entities/Trigger';

/**
 * Repository interface for Trigger operations
 * Follows Repository pattern for data access abstraction
 */
export interface ITriggerRepository {
  // Trigger CRUD
  findAll(workspaceId: string): Promise<Trigger[]>;
  findById(id: string): Promise<Trigger | null>;
  findByUserId(userId: string): Promise<Trigger[]>;
  findByConnectionId(connectionId: string): Promise<Trigger[]>;
  findActiveTriggers(): Promise<Trigger[]>;
  findTriggersDueForCheck(beforeTime: Date): Promise<Trigger[]>;
  create(input: CreateTriggerInput): Promise<Trigger>;
  update(id: string, input: UpdateTriggerInput): Promise<Trigger>;
  delete(id: string): Promise<void>;

  // State management
  updateLastChecked(id: string, timestamp: Date): Promise<void>;
  updateLastTriggered(id: string, timestamp: Date): Promise<void>;
  incrementErrorCount(id: string, error: string): Promise<void>;
  resetErrorCount(id: string): Promise<void>;

  // Trigger state (for polling)
  getState(triggerId: string): Promise<TriggerState | null>;
  setState(triggerId: string, state: Partial<TriggerState>): Promise<void>;

  // Events
  createEvent(event: Omit<TriggerEvent, 'id' | 'createdAt'>): Promise<TriggerEvent>;
  findEventsByTriggerId(triggerId: string, limit?: number): Promise<TriggerEvent[]>;
  findEventById(eventId: string): Promise<TriggerEvent | null>;
  updateEventStatus(
    eventId: string,
    status: TriggerEvent['status'],
    statusMessage?: string,
    webhookResponse?: TriggerEvent['webhookResponse']
  ): Promise<void>;
  findPendingEvents(): Promise<TriggerEvent[]>;
  findEventsForRetry(): Promise<TriggerEvent[]>;
  deleteOldEvents(olderThan: Date): Promise<number>;

  // Statistics
  getStatsByTriggerId(triggerId: string): Promise<{
    totalEvents: number;
    deliveredEvents: number;
    failedEvents: number;
    pendingEvents: number;
    avgDeliveryTime: number;
  }>;
}
