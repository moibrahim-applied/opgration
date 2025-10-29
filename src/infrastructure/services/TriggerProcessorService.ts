import {
  Trigger,
  TriggerEvent,
  ITriggerProcessor,
  ITriggerRepository,
  IConnectionRepository,
} from '@/src/domain';

/**
 * TriggerProcessorService
 * Handles trigger execution, event detection, and webhook delivery
 */
export class TriggerProcessorService implements ITriggerProcessor {
  constructor(
    private triggerRepo: ITriggerRepository,
    private connectionRepo: IConnectionRepository
  ) {}

  /**
   * Process all active triggers that are due for checking
   */
  async processActiveTriggers(): Promise<void> {
    try {
      // Find triggers that haven't been checked in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const triggers = await this.triggerRepo.findTriggersDueForCheck(fiveMinutesAgo);

      console.log(`[TriggerProcessor] Processing ${triggers.length} triggers...`);

      // Process triggers in parallel (batch of 10 at a time)
      const batchSize = 10;
      for (let i = 0; i < triggers.length; i += batchSize) {
        const batch = triggers.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(trigger => this.processTrigger(trigger))
        );
      }

      console.log(`[TriggerProcessor] Completed processing ${triggers.length} triggers`);
    } catch (error) {
      console.error('[TriggerProcessor] Error processing triggers:', error);
      throw error;
    }
  }

  /**
   * Process a single trigger
   */
  async processTrigger(trigger: Trigger): Promise<void> {
    try {
      console.log(`[TriggerProcessor] Processing trigger: ${trigger.name} (${trigger.id})`);

      // Update last checked timestamp
      await this.triggerRepo.updateLastChecked(trigger.id, new Date());

      // Check for new events
      const events = await this.checkForEvents(trigger);

      if (events.length > 0) {
        console.log(`[TriggerProcessor] Found ${events.length} new events for trigger ${trigger.name}`);

        // Fire events
        for (const eventData of events) {
          await this.fireEvent(trigger, eventData);
        }

        // Update last triggered timestamp
        await this.triggerRepo.updateLastTriggered(trigger.id, new Date());

        // Reset error count on success
        if (trigger.errorCount > 0) {
          await this.triggerRepo.resetErrorCount(trigger.id);
        }
      }
    } catch (error) {
      console.error(`[TriggerProcessor] Error processing trigger ${trigger.id}:`, error);

      // Increment error count
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.triggerRepo.incrementErrorCount(trigger.id, errorMessage);

      // If error count is too high, disable trigger
      if (trigger.errorCount >= 10) {
        console.error(`[TriggerProcessor] Disabling trigger ${trigger.id} due to too many errors`);
        await this.triggerRepo.update(trigger.id, { isActive: false });
      }
    }
  }

  /**
   * Check for new events based on trigger type
   */
  async checkForEvents(trigger: Trigger): Promise<any[]> {
    const handler = this.getHandlerForTriggerType(trigger.triggerType);
    if (!handler) {
      throw new Error(`No handler found for trigger type: ${trigger.triggerType}`);
    }

    return await handler(trigger);
  }

  /**
   * Fire a trigger event (create event record and send webhook)
   */
  async fireEvent(trigger: Trigger, eventData: any): Promise<TriggerEvent> {
    // Transform event data into webhook payload
    const webhookPayload = {
      trigger: {
        id: trigger.id,
        name: trigger.name,
        type: trigger.triggerType,
      },
      event: eventData,
      timestamp: new Date().toISOString(),
    };

    // Create event record
    const event = await this.triggerRepo.createEvent({
      triggerId: trigger.id,
      eventType: trigger.triggerType,
      eventData: eventData,
      status: 'pending',
      webhookUrl: trigger.webhookUrl,
      webhookMethod: trigger.webhookMethod,
      webhookPayload: webhookPayload,
      attemptCount: 0,
      maxAttempts: 3,
    });

    // Attempt to deliver webhook
    await this.deliverWebhook(event);

    return event;
  }

  /**
   * Deliver a webhook
   */
  async deliverWebhook(event: TriggerEvent): Promise<{
    success: boolean;
    statusCode: number;
    response: any;
    error?: string;
  }> {
    try {
      console.log(`[TriggerProcessor] Delivering webhook for event ${event.id} to ${event.webhookUrl}`);

      // Prepare headers
      const trigger = await this.triggerRepo.findById(event.triggerId);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Opgration-Triggers/1.0',
        'X-Opgration-Event-ID': event.id,
        'X-Opgration-Event-Type': event.eventType,
        'X-Opgration-Trigger-ID': event.triggerId,
        ...trigger?.webhookHeaders,
      };

      // Make HTTP request
      const response = await fetch(event.webhookUrl, {
        method: event.webhookMethod,
        headers,
        body: JSON.stringify(event.webhookPayload),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const responseBody = await response.text();
      let parsedBody;
      try {
        parsedBody = JSON.parse(responseBody);
      } catch {
        parsedBody = responseBody;
      }

      const webhookResponse = {
        statusCode: response.status,
        body: parsedBody,
        headers: Object.fromEntries(response.headers.entries()),
      };

      // Update event status
      if (response.ok) {
        await this.triggerRepo.updateEventStatus(
          event.id,
          'delivered',
          'Successfully delivered',
          webhookResponse
        );

        console.log(`[TriggerProcessor] ✓ Webhook delivered successfully for event ${event.id}`);

        return {
          success: true,
          statusCode: response.status,
          response: webhookResponse,
        };
      } else {
        // Non-2xx response, schedule retry
        const shouldRetry = event.attemptCount < event.maxAttempts - 1;

        if (shouldRetry) {
          const nextRetryDelay = this.calculateRetryDelay(event.attemptCount + 1);
          const nextRetryAt = new Date(Date.now() + nextRetryDelay);

          await this.triggerRepo.updateEventStatus(
            event.id,
            'retrying',
            `HTTP ${response.status}: Will retry at ${nextRetryAt.toISOString()}`,
            webhookResponse
          );

          console.log(`[TriggerProcessor] ⚠ Webhook failed (${response.status}), will retry for event ${event.id}`);
        } else {
          await this.triggerRepo.updateEventStatus(
            event.id,
            'failed',
            `HTTP ${response.status}: Max retries exceeded`,
            webhookResponse
          );

          console.log(`[TriggerProcessor] ✗ Webhook failed permanently for event ${event.id}`);
        }

        return {
          success: false,
          statusCode: response.status,
          response: webhookResponse,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`[TriggerProcessor] Error delivering webhook for event ${event.id}:`, errorMessage);

      // Schedule retry if attempts remaining
      const shouldRetry = event.attemptCount < event.maxAttempts - 1;

      if (shouldRetry) {
        const nextRetryDelay = this.calculateRetryDelay(event.attemptCount + 1);
        const nextRetryAt = new Date(Date.now() + nextRetryDelay);

        await this.triggerRepo.updateEventStatus(
          event.id,
          'retrying',
          `Error: ${errorMessage}. Will retry at ${nextRetryAt.toISOString()}`
        );
      } else {
        await this.triggerRepo.updateEventStatus(
          event.id,
          'failed',
          `Error: ${errorMessage}. Max retries exceeded`
        );
      }

      return {
        success: false,
        statusCode: 0,
        response: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Retry failed events
   */
  async retryFailedEvents(): Promise<void> {
    try {
      const eventsToRetry = await this.triggerRepo.findEventsForRetry();

      console.log(`[TriggerProcessor] Retrying ${eventsToRetry.length} failed events...`);

      for (const event of eventsToRetry) {
        await this.deliverWebhook(event);
      }
    } catch (error) {
      console.error('[TriggerProcessor] Error retrying failed events:', error);
    }
  }

  /**
   * Calculate retry delay using exponential backoff
   * 1st retry: 1 minute
   * 2nd retry: 5 minutes
   * 3rd retry: 15 minutes
   */
  private calculateRetryDelay(attemptNumber: number): number {
    const delays = [
      1 * 60 * 1000,  // 1 minute
      5 * 60 * 1000,  // 5 minutes
      15 * 60 * 1000, // 15 minutes
    ];
    return delays[attemptNumber - 1] || delays[delays.length - 1];
  }

  /**
   * Get handler function for a specific trigger type
   */
  private getHandlerForTriggerType(triggerType: string): ((trigger: Trigger) => Promise<any[]>) | null {
    const handlers: Record<string, (trigger: Trigger) => Promise<any[]>> = {
      'new-sheet-row': this.handleNewSheetRow.bind(this),
      'new-calendar-event': this.handleNewCalendarEvent.bind(this),
      'new-drive-file': this.handleNewDriveFile.bind(this),
    };

    return handlers[triggerType] || null;
  }

  /**
   * Handler: New Google Sheets Row
   */
  private async handleNewSheetRow(trigger: Trigger): Promise<any[]> {
    try {
      // Get connection
      const connection = await this.connectionRepo.findById(trigger.connectionId);
      if (!connection || !connection.accessToken) {
        throw new Error('Connection not found or no access token');
      }

      const { spreadsheetId, sheetName } = trigger.config;
      if (!spreadsheetId || !sheetName) {
        throw new Error('Missing spreadsheetId or sheetName in config');
      }

      // Get current state
      const state = await this.triggerRepo.getState(trigger.id);
      const lastRowCount = state?.lastRowCount || 0;

      // Fetch current rows from Google Sheets
      const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`;
      const response = await fetch(sheetsUrl, {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Google Sheets API error: ${response.status}`);
      }

      const data = await response.json();
      const values = data.values || [];

      // Check if there are new rows
      const currentRowCount = values.length;

      if (currentRowCount <= lastRowCount) {
        // No new rows
        return [];
      }

      // Extract new rows
      const headers = values[0] || [];
      const newRows = values.slice(lastRowCount);

      // Update state
      await this.triggerRepo.setState(trigger.id, {
        lastRowCount: currentRowCount,
        lastTimestamp: new Date(),
        stateData: {
          spreadsheetId,
          sheetName,
        },
      });

      // Transform rows into events
      return newRows.map((row, index) => {
        const rowObject: Record<string, any> = {};
        headers.forEach((header: string, idx: number) => {
          rowObject[header] = row[idx] || '';
        });

        return {
          type: 'new-row',
          rowNumber: lastRowCount + index + 1,
          row: rowObject,
          rawValues: row,
          spreadsheetId,
          sheetName,
        };
      });
    } catch (error) {
      console.error('[TriggerProcessor] Error in handleNewSheetRow:', error);
      throw error;
    }
  }

  /**
   * Handler: New Google Calendar Event
   */
  private async handleNewCalendarEvent(trigger: Trigger): Promise<any[]> {
    try {
      const connection = await this.connectionRepo.findById(trigger.connectionId);
      if (!connection || !connection.accessToken) {
        throw new Error('Connection not found or no access token');
      }

      const { calendarId = 'primary' } = trigger.config;

      // Get last check time
      const state = await this.triggerRepo.getState(trigger.id);
      const lastCheckTime = state?.lastTimestamp || new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Fetch events from Google Calendar
      const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${lastCheckTime.toISOString()}&orderBy=startTime&singleEvents=true`;

      const response = await fetch(calendarUrl, {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      const events = data.items || [];

      // Update state
      await this.triggerRepo.setState(trigger.id, {
        lastTimestamp: new Date(),
        stateData: { calendarId },
      });

      // Filter events created since last check
      const newEvents = events.filter((event: any) => {
        const created = new Date(event.created);
        return created > lastCheckTime;
      });

      return newEvents.map((event: any) => ({
        type: 'new-event',
        eventId: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        attendees: event.attendees,
        calendarId,
      }));
    } catch (error) {
      console.error('[TriggerProcessor] Error in handleNewCalendarEvent:', error);
      throw error;
    }
  }

  /**
   * Handler: New Google Drive File
   */
  private async handleNewDriveFile(trigger: Trigger): Promise<any[]> {
    try {
      const connection = await this.connectionRepo.findById(trigger.connectionId);
      if (!connection || !connection.accessToken) {
        throw new Error('Connection not found or no access token');
      }

      const { folderId, fileType } = trigger.config;

      // Get last check time
      const state = await this.triggerRepo.getState(trigger.id);
      const lastCheckTime = state?.lastTimestamp || new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Build query
      let query = `createdTime > '${lastCheckTime.toISOString()}' and trashed = false`;
      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }
      if (fileType) {
        query += ` and mimeType contains '${fileType}'`;
      }

      // Fetch files from Google Drive
      const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,createdTime,size,webViewLink)`;

      const response = await fetch(driveUrl, {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Google Drive API error: ${response.status}`);
      }

      const data = await response.json();
      const files = data.files || [];

      // Update state
      await this.triggerRepo.setState(trigger.id, {
        lastTimestamp: new Date(),
        stateData: { folderId, fileType },
      });

      return files.map((file: any) => ({
        type: 'new-file',
        fileId: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        createdTime: file.createdTime,
        webViewLink: file.webViewLink,
        folderId,
      }));
    } catch (error) {
      console.error('[TriggerProcessor] Error in handleNewDriveFile:', error);
      throw error;
    }
  }
}
