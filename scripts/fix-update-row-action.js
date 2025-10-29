const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUpdateRowAction() {
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

    // Update the Update Row action with proper configuration
    const { data, error } = await supabase
      .from('integration_actions')
      .update({
        description: 'Update values in a specific range or row',
        endpoint_path: '/spreadsheets/{{spreadsheetId}}/values/{{range}}',
        http_method: 'PUT',
        request_schema: {
          type: 'object',
          properties: {
            spreadsheetId: {
              type: 'string',
              required: true,
              description: 'The ID of the spreadsheet'
            },
            range: {
              type: 'string',
              required: true,
              description: 'The A1 notation of the range to update (e.g., Sheet1!A2:C2 or Sheet1!A2)',
              default: 'Sheet1!A2'
            },
            values: {
              type: 'array',
              required: true,
              description: 'Array of rows to update. Each row is an array of cell values. Example: [["UpdatedVal1", "UpdatedVal2"]]',
              default: [['Value1', 'Value2', 'Value3']]
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            spreadsheetId: {
              type: 'string'
            },
            updatedRange: {
              type: 'string'
            },
            updatedRows: {
              type: 'number'
            },
            updatedColumns: {
              type: 'number'
            },
            updatedCells: {
              type: 'number'
            }
          }
        },
        transform_config: {
          request: {
            body: {
              values: '{{values}}'
            },
            params: {
              valueInputOption: 'USER_ENTERED'
            }
          }
        }
      })
      .eq('slug', 'update-row')
      .eq('integration_id', integration.id)
      .select();

    if (error) {
      console.error('Error updating action:', error);
      return;
    }

    console.log('✅ Successfully fixed Update Row action!');
    console.log('');
    console.log('Updated configuration:');
    console.log('- Endpoint:', data[0].endpoint_path);
    console.log('- HTTP Method:', data[0].http_method);
    console.log('- Request Schema:', Object.keys(data[0].request_schema.properties).join(', '));
    console.log('- Transform Config:', JSON.stringify(data[0].transform_config, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

fixUpdateRowAction();
