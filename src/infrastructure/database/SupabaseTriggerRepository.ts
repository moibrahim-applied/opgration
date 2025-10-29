import { SupabaseClient } from '@supabase/supabase-js';
import {
  Trigger,
  TriggerEvent,
  TriggerState,
  CreateTriggerInput,
  UpdateTriggerInput,
  ITriggerRepository,
} from '@/src/domain';

/**
 * Supabase implementation of ITriggerRepository
 * Handles all database operations for triggers
 */
export class SupabaseTriggerRepository implements ITriggerRepository {
  constructor(private supabase: SupabaseClient) {}

  // ========== Trigger CRUD ==========

  async findAll(workspaceId: string): Promise<Trigger[]> {
    const { data, error } = await this.supabase
      .from('triggers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapToTrigger);
  }

  async findById(id: string): Promise<Trigger | null> {
    const { data, error } = await this.supabase
      .from('triggers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.mapToTrigger(data);
  }

  async findByUserId(userId: string): Promise<Trigger[]> {
    const { data, error } = await this.supabase
      .from('triggers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapToTrigger);
  }

  async findByConnectionId(connectionId: string): Promise<Trigger[]> {
    const { data, error } = await this.supabase
      .from('triggers')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false});

    if (error) throw error;
    return data.map(this.mapToTrigger);
  }

  async findActiveTriggers(): Promise<Trigger[]> {
    const { data, error } = await this.supabase
      .from('triggers')
      .select('*')
      .eq('is_active', true)
      .order('last_checked_at', { ascending: true, nullsFirst: true });

    if (error) throw error;
    return data.map(this.mapToTrigger);
  }

  async findTriggersDueForCheck(beforeTime: Date): Promise<Trigger[]> {
    const { data, error } = await this.supabase
      .from('triggers')
      .select('*')
      .eq('is_active', true)
      .or(`last_checked_at.is.null,last_checked_at.lt.${beforeTime.toISOString()}`)
      .order('last_checked_at', { ascending: true, nullsFirst: true });

    if (error) throw error;
    return data.map(this.mapToTrigger);
  }

  async create(input: CreateTriggerInput): Promise<Trigger> {
    const { data, error } = await this.supabase
      .from('triggers')
      .insert({
        user_id: input.userId,
        workspace_id: input.workspaceId,
        project_id: input.projectId,
        connection_id: input.connectionId,
        integration_id: input.integrationId,
        name: input.name,
        description: input.description,
        trigger_type: input.triggerType,
        config: input.config,
        webhook_url: input.webhookUrl,
        webhook_headers: input.webhookHeaders || {},
        webhook_method: input.webhookMethod || 'POST',
        is_active: input.isActive !== undefined ? input.isActive : true,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToTrigger(data);
  }

  async update(id: string, input: UpdateTriggerInput): Promise<Trigger> {
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.config !== undefined) updateData.config = input.config;
    if (input.webhookUrl !== undefined) updateData.webhook_url = input.webhookUrl;
    if (input.webhookHeaders !== undefined) updateData.webhook_headers = input.webhookHeaders;
    if (input.webhookMethod !== undefined) updateData.webhook_method = input.webhookMethod;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    const { data, error } = await this.supabase
      .from('triggers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToTrigger(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('triggers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ========== State Management ==========

  async updateLastChecked(id: string, timestamp: Date): Promise<void> {
    const { error } = await this.supabase
      .from('triggers')
      .update({ last_checked_at: timestamp.toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async updateLastTriggered(id: string, timestamp: Date): Promise<void> {
    const { error } = await this.supabase
      .from('triggers')
      .update({ last_triggered_at: timestamp.toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async incrementErrorCount(id: string, errorMessage: string): Promise<void> {
    const { error } = await this.supabase.rpc('increment_trigger_error', {
      trigger_id: id,
      error_message: errorMessage,
    });

    // If RPC doesn't exist, fallback to manual increment
    if (error?.code === '42883') {
      const trigger = await this.findById(id);
      if (trigger) {
        await this.supabase
          .from('triggers')
          .update({
            error_count: trigger.errorCount + 1,
            last_error: errorMessage,
          })
          .eq('id', id);
      }
      return;
    }

    if (error) throw error;
  }

  async resetErrorCount(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('triggers')
      .update({
        error_count: 0,
        last_error: null,
      })
      .eq('id', id);

    if (error) throw error;
  }

  // ========== Trigger State ==========

  async getState(triggerId: string): Promise<TriggerState | null> {
    const { data, error } = await this.supabase
      .from('trigger_state')
      .select('*')
      .eq('trigger_id', triggerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToTriggerState(data);
  }

  async setState(triggerId: string, state: Partial<TriggerState>): Promise<void> {
    const stateData: Record<string, any> = {
      trigger_id: triggerId,
    };

    if (state.lastItemId !== undefined) stateData.last_item_id = state.lastItemId;
    if (state.lastTimestamp !== undefined) stateData.last_timestamp = state.lastTimestamp?.toISOString();
    if (state.lastRowCount !== undefined) stateData.last_row_count = state.lastRowCount;
    if (state.stateData !== undefined) stateData.state_data = state.stateData;

    const { error } = await this.supabase
      .from('trigger_state')
      .upsert(stateData, { onConflict: 'trigger_id' });

    if (error) throw error;
  }

  // ========== Events ==========

  async createEvent(event: Omit<TriggerEvent, 'id' | 'createdAt'>): Promise<TriggerEvent> {
    const { data, error } = await this.supabase
      .from('trigger_events')
      .insert({
        trigger_id: event.triggerId,
        event_type: event.eventType,
        event_data: event.eventData,
        status: event.status,
        status_message: event.statusMessage,
        webhook_url: event.webhookUrl,
        webhook_method: event.webhookMethod,
        webhook_payload: event.webhookPayload,
        webhook_response: event.webhookResponse,
        attempt_count: event.attemptCount,
        max_attempts: event.maxAttempts,
        next_retry_at: event.nextRetryAt?.toISOString(),
        delivered_at: event.deliveredAt?.toISOString(),
        failed_at: event.failedAt?.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToTriggerEvent(data);
  }

  async findEventsByTriggerId(triggerId: string, limit: number = 50): Promise<TriggerEvent[]> {
    const { data, error } = await this.supabase
      .from('trigger_events')
      .select('*')
      .eq('trigger_id', triggerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data.map(this.mapToTriggerEvent);
  }

  async findEventById(eventId: string): Promise<TriggerEvent | null> {
    const { data, error } = await this.supabase
      .from('trigger_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToTriggerEvent(data);
  }

  async updateEventStatus(
    eventId: string,
    status: TriggerEvent['status'],
    statusMessage?: string,
    webhookResponse?: TriggerEvent['webhookResponse']
  ): Promise<void> {
    const updateData: Record<string, any> = { status };

    if (statusMessage !== undefined) updateData.status_message = statusMessage;
    if (webhookResponse !== undefined) updateData.webhook_response = webhookResponse;

    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    } else if (status === 'failed') {
      updateData.failed_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('trigger_events')
      .update(updateData)
      .eq('id', eventId);

    if (error) throw error;
  }

  async findPendingEvents(): Promise<TriggerEvent[]> {
    const { data, error } = await this.supabase
      .from('trigger_events')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;
    return data.map(this.mapToTriggerEvent);
  }

  async findEventsForRetry(): Promise<TriggerEvent[]> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('trigger_events')
      .select('*')
      .eq('status', 'retrying')
      .lte('next_retry_at', now)
      .order('next_retry_at', { ascending: true })
      .limit(50);

    if (error) throw error;
    return data.map(this.mapToTriggerEvent);
  }

  async deleteOldEvents(olderThan: Date): Promise<number> {
    const { data, error } = await this.supabase
      .from('trigger_events')
      .delete()
      .lt('created_at', olderThan.toISOString())
      .in('status', ['delivered', 'failed'])
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  }

  // ========== Statistics ==========

  async getStatsByTriggerId(triggerId: string): Promise<{
    totalEvents: number;
    deliveredEvents: number;
    failedEvents: number;
    pendingEvents: number;
    avgDeliveryTime: number;
  }> {
    // Get counts by status
    const { data: counts, error: countsError } = await this.supabase
      .from('trigger_events')
      .select('status')
      .eq('trigger_id', triggerId);

    if (countsError) throw countsError;

    const stats = {
      totalEvents: counts.length,
      deliveredEvents: counts.filter(e => e.status === 'delivered').length,
      failedEvents: counts.filter(e => e.status === 'failed').length,
      pendingEvents: counts.filter(e => e.status === 'pending' || e.status === 'retrying').length,
      avgDeliveryTime: 0,
    };

    // Calculate average delivery time for delivered events
    const { data: deliveredEvents, error: deliveredError } = await this.supabase
      .from('trigger_events')
      .select('created_at, delivered_at')
      .eq('trigger_id', triggerId)
      .eq('status', 'delivered')
      .not('delivered_at', 'is', null);

    if (deliveredError) throw deliveredError;

    if (deliveredEvents && deliveredEvents.length > 0) {
      const totalTime = deliveredEvents.reduce((sum, event) => {
        const created = new Date(event.created_at).getTime();
        const delivered = new Date(event.delivered_at).getTime();
        return sum + (delivered - created);
      }, 0);

      stats.avgDeliveryTime = totalTime / deliveredEvents.length;
    }

    return stats;
  }

  // ========== Mappers ==========

  private mapToTrigger(data: any): Trigger {
    return {
      id: data.id,
      userId: data.user_id,
      workspaceId: data.workspace_id,
      projectId: data.project_id,
      connectionId: data.connection_id,
      integrationId: data.integration_id,
      name: data.name,
      description: data.description,
      triggerType: data.trigger_type,
      config: data.config,
      webhookUrl: data.webhook_url,
      webhookHeaders: data.webhook_headers,
      webhookMethod: data.webhook_method,
      isActive: data.is_active,
      lastCheckedAt: data.last_checked_at ? new Date(data.last_checked_at) : undefined,
      lastTriggeredAt: data.last_triggered_at ? new Date(data.last_triggered_at) : undefined,
      errorCount: data.error_count,
      lastError: data.last_error,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapToTriggerEvent(data: any): TriggerEvent {
    return {
      id: data.id,
      triggerId: data.trigger_id,
      eventType: data.event_type,
      eventData: data.event_data,
      status: data.status,
      statusMessage: data.status_message,
      webhookUrl: data.webhook_url,
      webhookMethod: data.webhook_method,
      webhookPayload: data.webhook_payload,
      webhookResponse: data.webhook_response,
      attemptCount: data.attempt_count,
      maxAttempts: data.max_attempts,
      nextRetryAt: data.next_retry_at ? new Date(data.next_retry_at) : undefined,
      createdAt: new Date(data.created_at),
      deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
      failedAt: data.failed_at ? new Date(data.failed_at) : undefined,
    };
  }

  private mapToTriggerState(data: any): TriggerState {
    return {
      triggerId: data.trigger_id,
      lastItemId: data.last_item_id,
      lastTimestamp: data.last_timestamp ? new Date(data.last_timestamp) : undefined,
      lastRowCount: data.last_row_count,
      stateData: data.state_data,
      updatedAt: new Date(data.updated_at),
    };
  }
}
