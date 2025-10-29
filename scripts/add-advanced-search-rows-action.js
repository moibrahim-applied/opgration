const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addAdvancedSearchRowsAction() {
  try {
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id, base_url')
      .eq('slug', 'google-sheets')
      .single();

    if (integrationError) {
      console.error('Integration not found:', integrationError);
      return;
    }

    console.log('Found Google Sheets integration:', integration.id);

    // Add Advanced Search Rows action
    const { data, error } = await supabase
      .from('integration_actions')
      .insert({
        integration_id: integration.id,
        name: 'Search Rows (Advanced)',
        slug: 'search-rows-advanced',
        description: 'Search and filter rows with multiple conditions using AND/OR logic',
        http_method: 'POST',
        endpoint_path: 'https://azariah-cherubic-acronically.ngrok-free.dev/api/sheets/search',
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
            filters: {
              type: 'array',
              required: true,
              description: 'Array of filter conditions. Each filter has columnName and searchValue',
              default: [
                {
                  columnName: 'Status',
                  searchValue: 'Active'
                }
              ]
            },
            filterLogic: {
              type: 'string',
              description: 'How to combine multiple filters: AND or OR',
              default: 'AND'
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
        transform_config: {}
      })
      .select();

    if (error) {
      console.error('Error adding action:', error);
      return;
    }

    console.log('✅ Successfully added Search Rows (Advanced) action!');
    console.log('');
    console.log('Example payload:');
    console.log(JSON.stringify({
      spreadsheetId: 'YOUR_SPREADSHEET_ID',
      sheetName: 'Sheet1',
      filters: [
        { columnName: 'Status', searchValue: 'Active' },
        { columnName: 'Department', searchValue: 'Sales' }
      ],
      filterLogic: 'AND',
      returnAll: true
    }, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

addAdvancedSearchRowsAction();
