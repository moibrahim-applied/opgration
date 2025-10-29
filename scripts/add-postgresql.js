const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addPostgreSQL() {
  try {
    // Add PostgreSQL integration with 'api_key' auth (can be used for connection string)
    const { data: integrationData, error: integrationError } = await supabase
      .from('integrations')
      .insert({
        name: 'PostgreSQL',
        slug: 'postgresql',
        description: 'Execute SQL queries and manage PostgreSQL databases',
        icon_svg: 'https://n8n.io/nodes/postgres.svg',
        base_url: 'direct',
        auth_type: 'api_key', // Will store connection string as API key
        is_active: true
      })
      .select()
      .single();

    if (integrationError) {
      console.error('Error adding PostgreSQL:', integrationError);
      return;
    }

    console.log('✅ Added PostgreSQL');

    // Add actions
    const actions = [
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
            data: {
              type: 'object',
              required: true,
              description: 'Column-value pairs',
              default: { name: 'John', email: 'john@example.com' }
            }
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
            table: { type: 'string', required: true, description: 'Table name' },
            data: { type: 'object', required: true, description: 'Data to update' },
            where: {
              type: 'object',
              required: true,
              description: 'WHERE condition',
              default: { id: 1 }
            }
          }
        }
      },
      {
        name: 'Delete Rows',
        slug: 'delete-rows',
        description: 'Delete rows matching a condition',
        http_method: 'POST',
        endpoint_path: '/delete',
        request_schema: {
          type: 'object',
          properties: {
            table: { type: 'string', required: true, description: 'Table name' },
            where: {
              type: 'object',
              required: true,
              description: 'WHERE condition',
              default: { id: 1 }
            }
          }
        }
      }
    ];

    for (const action of actions) {
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

    console.log('\n✅ PostgreSQL integration added successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

addPostgreSQL();
