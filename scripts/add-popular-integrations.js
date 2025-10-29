const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const integrations = [
  {
    name: 'Telegram',
    slug: 'telegram',
    description: 'Send messages, manage groups, and automate Telegram bots',
    category: 'Communication',
    icon_svg: 'https://n8n.io/nodes/telegram.svg',
    base_url: 'https://api.telegram.org',
    auth_type: 'api_key',
    actions: [
      {
        name: 'Send Message',
        slug: 'send-message',
        description: 'Send a text message to a chat',
        http_method: 'POST',
        endpoint_path: '/bot{{botToken}}/sendMessage',
        request_schema: {
          type: 'object',
          properties: {
            botToken: { type: 'string', required: true, description: 'Bot API token' },
            chatId: { type: 'string', required: true, description: 'Chat ID or @username' },
            text: { type: 'string', required: true, description: 'Message text' },
            parseMode: { type: 'string', description: 'HTML or Markdown', default: 'HTML' }
          }
        }
      },
      {
        name: 'Send Photo',
        slug: 'send-photo',
        description: 'Send a photo to a chat',
        http_method: 'POST',
        endpoint_path: '/bot{{botToken}}/sendPhoto',
        request_schema: {
          type: 'object',
          properties: {
            botToken: { type: 'string', required: true },
            chatId: { type: 'string', required: true },
            photo: { type: 'string', required: true, description: 'Photo URL or file_id' },
            caption: { type: 'string', description: 'Photo caption' }
          }
        }
      }
    ]
  },
  {
    name: 'Google Gemini',
    slug: 'google-gemini',
    description: 'Access Google\'s Gemini AI for text generation and analysis',
    category: 'AI',
    icon_svg: 'https://n8n.io/nodes/google-gemini.svg',
    base_url: 'https://generativelanguage.googleapis.com/v1',
    auth_type: 'api_key',
    actions: [
      {
        name: 'Generate Text',
        slug: 'generate-text',
        description: 'Generate text using Gemini AI',
        http_method: 'POST',
        endpoint_path: '/models/{{model}}:generateContent',
        request_schema: {
          type: 'object',
          properties: {
            model: { type: 'string', required: true, default: 'gemini-pro', description: 'Model name' },
            prompt: { type: 'string', required: true, description: 'Text prompt' },
            temperature: { type: 'number', default: 0.7, description: 'Creativity (0-1)' },
            maxTokens: { type: 'number', default: 1024, description: 'Max response length' }
          }
        }
      },
      {
        name: 'Analyze Image',
        slug: 'analyze-image',
        description: 'Analyze images with Gemini Vision',
        http_method: 'POST',
        endpoint_path: '/models/gemini-pro-vision:generateContent',
        request_schema: {
          type: 'object',
          properties: {
            imageUrl: { type: 'string', required: true, description: 'Image URL' },
            prompt: { type: 'string', required: true, description: 'What to analyze' }
          }
        }
      }
    ]
  },
  {
    name: 'Microsoft Excel',
    slug: 'microsoft-excel',
    description: 'Read and write Excel spreadsheets in OneDrive or SharePoint',
    category: 'Productivity',
    icon_svg: 'https://n8n.io/nodes/microsoft-excel.svg',
    base_url: 'https://graph.microsoft.com/v1.0',
    auth_type: 'oauth2',
    actions: [
      {
        name: 'Add Row',
        slug: 'add-row',
        description: 'Add a new row to an Excel table',
        http_method: 'POST',
        endpoint_path: '/me/drive/items/{{workbookId}}/workbook/tables/{{tableName}}/rows',
        request_schema: {
          type: 'object',
          properties: {
            workbookId: { type: 'string', required: true, description: 'Excel file ID' },
            tableName: { type: 'string', required: true, description: 'Table name' },
            values: { type: 'array', required: true, description: 'Row values', default: [['Value1', 'Value2']] }
          }
        }
      },
      {
        name: 'Get Rows',
        slug: 'get-rows',
        description: 'Get all rows from an Excel table',
        http_method: 'GET',
        endpoint_path: '/me/drive/items/{{workbookId}}/workbook/tables/{{tableName}}/rows',
        request_schema: {
          type: 'object',
          properties: {
            workbookId: { type: 'string', required: true },
            tableName: { type: 'string', required: true }
          }
        }
      },
      {
        name: 'Update Row',
        slug: 'update-row',
        description: 'Update a specific row in Excel table',
        http_method: 'PATCH',
        endpoint_path: '/me/drive/items/{{workbookId}}/workbook/tables/{{tableName}}/rows/itemAt(index={{rowIndex}})',
        request_schema: {
          type: 'object',
          properties: {
            workbookId: { type: 'string', required: true },
            tableName: { type: 'string', required: true },
            rowIndex: { type: 'number', required: true, description: 'Row index (0-based)' },
            values: { type: 'array', required: true }
          }
        }
      }
    ]
  },
  {
    name: 'PostgreSQL',
    slug: 'postgresql',
    description: 'Execute SQL queries and manage PostgreSQL databases',
    category: 'Database',
    icon_svg: 'https://n8n.io/nodes/postgres.svg',
    base_url: 'direct',
    auth_type: 'database',
    actions: [
      {
        name: 'Execute Query',
        slug: 'execute-query',
        description: 'Execute a SQL query',
        http_method: 'POST',
        endpoint_path: '/query',
        request_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', required: true, description: 'SQL query to execute' },
            parameters: { type: 'array', description: 'Query parameters', default: [] }
          }
        }
      },
      {
        name: 'Insert Row',
        slug: 'insert-row',
        description: 'Insert a new row into a table',
        http_method: 'POST',
        endpoint_path: '/insert',
        request_schema: {
          type: 'object',
          properties: {
            table: { type: 'string', required: true, description: 'Table name' },
            data: { type: 'object', required: true, description: 'Column-value pairs', default: { name: 'John', email: 'john@example.com' } }
          }
        }
      },
      {
        name: 'Update Rows',
        slug: 'update-rows',
        description: 'Update rows matching a condition',
        http_method: 'POST',
        endpoint_path: '/update',
        request_schema: {
          type: 'object',
          properties: {
            table: { type: 'string', required: true },
            data: { type: 'object', required: true, description: 'Data to update' },
            where: { type: 'object', required: true, description: 'WHERE condition', default: { id: 1 } }
          }
        }
      }
    ]
  },
  {
    name: 'Google Calendar',
    slug: 'google-calendar',
    description: 'Create, update, and manage calendar events',
    category: 'Productivity',
    icon_svg: 'https://n8n.io/nodes/google-calendar.svg',
    base_url: 'https://www.googleapis.com/calendar/v3',
    auth_type: 'oauth2',
    actions: [
      {
        name: 'Create Event',
        slug: 'create-event',
        description: 'Create a new calendar event',
        http_method: 'POST',
        endpoint_path: '/calendars/{{calendarId}}/events',
        request_schema: {
          type: 'object',
          properties: {
            calendarId: { type: 'string', required: true, default: 'primary', description: 'Calendar ID' },
            summary: { type: 'string', required: true, description: 'Event title' },
            description: { type: 'string', description: 'Event description' },
            startDateTime: { type: 'string', required: true, description: 'Start time (ISO 8601)' },
            endDateTime: { type: 'string', required: true, description: 'End time (ISO 8601)' },
            attendees: { type: 'array', description: 'Email addresses', default: [] }
          }
        }
      },
      {
        name: 'List Events',
        slug: 'list-events',
        description: 'List upcoming calendar events',
        http_method: 'GET',
        endpoint_path: '/calendars/{{calendarId}}/events',
        request_schema: {
          type: 'object',
          properties: {
            calendarId: { type: 'string', required: true, default: 'primary' },
            timeMin: { type: 'string', description: 'Start time filter (ISO 8601)' },
            maxResults: { type: 'number', default: 10, description: 'Max events to return' }
          }
        }
      },
      {
        name: 'Update Event',
        slug: 'update-event',
        description: 'Update an existing calendar event',
        http_method: 'PUT',
        endpoint_path: '/calendars/{{calendarId}}/events/{{eventId}}',
        request_schema: {
          type: 'object',
          properties: {
            calendarId: { type: 'string', required: true, default: 'primary' },
            eventId: { type: 'string', required: true, description: 'Event ID' },
            summary: { type: 'string', description: 'New title' },
            description: { type: 'string', description: 'New description' }
          }
        }
      },
      {
        name: 'Delete Event',
        slug: 'delete-event',
        description: 'Delete a calendar event',
        http_method: 'DELETE',
        endpoint_path: '/calendars/{{calendarId}}/events/{{eventId}}',
        request_schema: {
          type: 'object',
          properties: {
            calendarId: { type: 'string', required: true, default: 'primary' },
            eventId: { type: 'string', required: true }
          }
        }
      }
    ]
  },
  {
    name: 'Monday.com',
    slug: 'monday',
    description: 'Manage boards, items, and workflows on Monday.com',
    category: 'Project Management',
    icon_svg: 'https://n8n.io/nodes/mondaycom.svg',
    base_url: 'https://api.monday.com/v2',
    auth_type: 'api_key',
    actions: [
      {
        name: 'Create Item',
        slug: 'create-item',
        description: 'Create a new item in a board',
        http_method: 'POST',
        endpoint_path: '/graphql',
        request_schema: {
          type: 'object',
          properties: {
            boardId: { type: 'string', required: true, description: 'Board ID' },
            itemName: { type: 'string', required: true, description: 'Item name' },
            columnValues: { type: 'object', description: 'Column values as JSON', default: {} }
          }
        }
      },
      {
        name: 'Update Item',
        slug: 'update-item',
        description: 'Update an existing item',
        http_method: 'POST',
        endpoint_path: '/graphql',
        request_schema: {
          type: 'object',
          properties: {
            itemId: { type: 'string', required: true, description: 'Item ID' },
            columnValues: { type: 'object', required: true, description: 'Column values to update' }
          }
        }
      },
      {
        name: 'Get Items',
        slug: 'get-items',
        description: 'Get items from a board',
        http_method: 'POST',
        endpoint_path: '/graphql',
        request_schema: {
          type: 'object',
          properties: {
            boardId: { type: 'string', required: true },
            limit: { type: 'number', default: 25, description: 'Max items to return' }
          }
        }
      },
      {
        name: 'Create Update',
        slug: 'create-update',
        description: 'Add an update/comment to an item',
        http_method: 'POST',
        endpoint_path: '/graphql',
        request_schema: {
          type: 'object',
          properties: {
            itemId: { type: 'string', required: true },
            body: { type: 'string', required: true, description: 'Update text' }
          }
        }
      }
    ]
  }
];

async function addIntegrations() {
  console.log('Adding new integrations...\n');

  for (const integration of integrations) {
    try {
      // Insert integration
      const { data: integrationData, error: integrationError } = await supabase
        .from('integrations')
        .insert({
          name: integration.name,
          slug: integration.slug,
          description: integration.description,
          icon_svg: integration.icon_svg,
          base_url: integration.base_url,
          auth_type: integration.auth_type,
          is_active: true
        })
        .select()
        .single();

      if (integrationError) {
        console.error(`❌ Error adding ${integration.name}:`, integrationError.message);
        continue;
      }

      console.log(`✅ Added ${integration.name}`);

      // Add actions
      for (const action of integration.actions) {
        const { error: actionError } = await supabase
          .from('integration_actions')
          .insert({
            integration_id: integrationData.id,
            name: action.name,
            slug: action.slug,
            description: action.description,
            http_method: action.http_method,
            endpoint_path: action.endpoint_path,
            request_schema: action.request_schema,
            response_schema: {},
            transform_config: {}
          });

        if (actionError) {
          console.error(`  ❌ Error adding action ${action.name}:`, actionError.message);
        } else {
          console.log(`  ✓ Added action: ${action.name}`);
        }
      }

      console.log('');
    } catch (error) {
      console.error(`❌ Error processing ${integration.name}:`, error);
    }
  }

  console.log('✅ Done! Added all integrations.');
}

addIntegrations();
