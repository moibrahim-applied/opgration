const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addUpdateRowAdvancedAction() {
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

    // Add the Update Row (Advanced) action
    const { data, error } = await supabase
      .from('integration_actions')
      .insert({
        integration_id: integration.id,
        name: 'Update Row (Advanced)',
        slug: 'update-row-advanced',
        description: 'Find and update rows based on search criteria. Updates specific columns only.',
        http_method: 'POST',
        endpoint_path: 'https://azariah-cherubic-acronically.ngrok-free.dev/api/sheets/update',
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
              description: 'The name of the sheet/tab to search in',
              default: 'Sheet1'
            },
            filters: {
              type: 'array',
              required: true,
              description: 'Array of search conditions to find the row. Example: [{"columnName": "Id", "searchValue": "100"}]',
              default: [{ columnName: 'Id', searchValue: '100' }]
            },
            updateValues: {
              type: 'object',
              required: true,
              description: 'Object mapping column names to new values. Example: {"Status": "Completed", "Notes": "Done"}',
              default: { Status: 'Updated', Notes: 'Modified by automation' }
            },
            updateAllMatches: {
              type: 'boolean',
              description: 'If true, updates all matching rows. If false, only updates the first match.',
              default: false
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            updatedRows: {
              type: 'number'
            },
            failedRows: {
              type: 'number'
            },
            matchedRowNumbers: {
              type: 'array',
              description: 'Array of row numbers that were updated'
            }
          }
        },
        transform_config: {
          request: {
            body: {
              spreadsheetId: '{{spreadsheetId}}',
              sheetName: '{{sheetName}}',
              filters: '{{filters}}',
              updateValues: '{{updateValues}}',
              updateAllMatches: '{{updateAllMatches}}'
            }
          }
        }
      })
      .select();

    if (error) {
      console.error('Error adding action:', error);
      return;
    }

    console.log('✅ Successfully added Update Row (Advanced) action!');
    console.log('');
    console.log('Configuration:');
    console.log('- Name:', data[0].name);
    console.log('- Slug:', data[0].slug);
    console.log('- Endpoint:', data[0].endpoint_path);
    console.log('- HTTP Method:', data[0].http_method);
    console.log('');
    console.log('Example usage:');
    console.log('  filters: [{"columnName": "Id", "searchValue": "100"}]');
    console.log('  updateValues: {"Status": "Completed", "Notes": "Updated"}');
  } catch (error) {
    console.error('Error:', error);
  }
}

addUpdateRowAdvancedAction();
