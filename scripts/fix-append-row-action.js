const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAppendRowAction() {
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

    // Update the Append Row action
    const { data, error } = await supabase
      .from('integration_actions')
      .update({
        description: 'Append a new row to the end of a Google Sheets spreadsheet',
        endpoint_path: '/spreadsheets/{{spreadsheetId}}/values/{{range}}:append',
        request_schema: {
          type: 'object',
          properties: {
            spreadsheetId: {
              type: 'string',
              required: true,
              description: 'The ID of the spreadsheet (from the URL)'
            },
            range: {
              type: 'string',
              required: true,
              description: 'The A1 notation of the range to append to (e.g., Sheet1!A1 or just Sheet1)',
              default: 'Sheet1'
            },
            values: {
              type: 'array',
              required: true,
              description: 'Array of rows to append. Each row is an array of cell values. Example: [["Row1Col1", "Row1Col2"], ["Row2Col1", "Row2Col2"]]',
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
            updates: {
              type: 'object',
              description: 'Information about the update'
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
      .eq('slug', 'append-row')
      .eq('integration_id', integration.id)
      .select();

    if (error) {
      console.error('Error updating action:', error);
      return;
    }

    console.log('✅ Successfully fixed Append Row action!');
    console.log('');
    console.log('Updated configuration:');
    console.log('- Endpoint:', data[0].endpoint_path);
    console.log('- Request Schema:', Object.keys(data[0].request_schema.properties).join(', '));
    console.log('- Transform Config:', JSON.stringify(data[0].transform_config, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAppendRowAction();
