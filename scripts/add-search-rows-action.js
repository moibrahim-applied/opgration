const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSearchRowsAction() {
  try {
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id')
      .eq('slug', 'google-sheets')
      .single();

    if (integrationError) {
      console.error('Integration not found:', integrationError);
      return;
    }

    console.log('Found Google Sheets integration:', integration.id);

    // Add Search Rows action
    const { data, error } = await supabase
      .from('integration_actions')
      .insert({
        integration_id: integration.id,
        name: 'Search Rows',
        slug: 'search-rows',
        description: 'Search and filter rows in a spreadsheet by column name and value',
        http_method: 'GET',
        endpoint_path: '/spreadsheets/{{spreadsheetId}}/values/{{sheetName}}',
        request_schema: {
          type: 'object',
          properties: {
            spreadsheetId: {
              type: 'string',
              required: true,
              description: 'The ID of the spreadsheet (from the URL)'
            },
            sheetName: {
              type: 'string',
              required: true,
              description: 'The name of the sheet/tab (e.g., Sheet1)',
              default: 'Sheet1'
            },
            columnName: {
              type: 'string',
              required: true,
              description: 'The column header name to filter by (e.g., Status, Email, Name)'
            },
            searchValue: {
              type: 'string',
              required: true,
              description: 'The value to search for in the specified column'
            },
            returnAll: {
              type: 'boolean',
              description: 'Return all matching rows (true) or just the first match (false)',
              default: true
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            matchedRows: {
              type: 'array',
              description: 'Array of matching rows with column names as keys'
            },
            totalMatches: {
              type: 'number',
              description: 'Total number of matches found'
            }
          }
        },
        transform_config: {
          request: {
            params: {
              valueRenderOption: 'FORMATTED_VALUE'
            }
          }
        }
      })
      .select();

    if (error) {
      console.error('Error adding action:', error);
      return;
    }

    console.log('✅ Successfully added Search Rows action!');
    console.log(JSON.stringify(data[0], null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

addSearchRowsAction();
