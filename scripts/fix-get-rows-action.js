const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixGetRowsAction() {
  try {
    // First check/update Google Sheets base URL
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id, base_url')
      .eq('slug', 'google-sheets')
      .single();

    if (integrationError) {
      console.error('Integration not found:', integrationError);
      return;
    }

    // Update base URL if needed
    const correctBaseUrl = 'https://sheets.googleapis.com/v4';
    if (integration.base_url !== correctBaseUrl) {
      console.log('Updating base URL...');
      await supabase
        .from('integrations')
        .update({ base_url: correctBaseUrl })
        .eq('id', integration.id);
      console.log('✅ Base URL updated to:', correctBaseUrl);
    } else {
      console.log('✅ Base URL is correct:', correctBaseUrl);
    }

    // Update the Get Row(s) action
    const { data, error } = await supabase
      .from('integration_actions')
      .update({
        description: 'Read values from a range in a Google Sheets spreadsheet',
        endpoint_path: '/spreadsheets/{{spreadsheetId}}/values/{{range}}',
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
              description: 'The A1 notation of the range to retrieve (e.g., Sheet1!A1:D10 or A1:D10)',
              default: 'Sheet1!A1:Z100'
            },
            valueRenderOption: {
              type: 'string',
              description: 'How values should be rendered: FORMATTED_VALUE, UNFORMATTED_VALUE, or FORMULA',
              default: 'FORMATTED_VALUE'
            },
            dateTimeRenderOption: {
              type: 'string',
              description: 'How dates should be rendered: SERIAL_NUMBER or FORMATTED_STRING',
              default: 'FORMATTED_STRING'
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            range: {
              type: 'string',
              description: 'The range that was read'
            },
            majorDimension: {
              type: 'string',
              description: 'ROWS or COLUMNS'
            },
            values: {
              type: 'array',
              description: 'Array of rows, each row is an array of cell values'
            }
          }
        },
        transform_config: {
          request: {
            params: {
              valueRenderOption: '{{valueRenderOption}}',
              dateTimeRenderOption: '{{dateTimeRenderOption}}'
            }
          }
        }
      })
      .eq('slug', 'get-rows')
      .eq('integration_id', integration.id)
      .select();

    if (error) {
      console.error('Error updating action:', error);
      return;
    }

    console.log('');
    console.log('✅ Successfully fixed Get Row(s) action!');
    console.log('');
    console.log('Updated configuration:');
    console.log('- Endpoint:', data[0].endpoint_path);
    console.log('- Request Schema:', Object.keys(data[0].request_schema.properties).join(', '));
    console.log('- Transform Config:', JSON.stringify(data[0].transform_config, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

fixGetRowsAction();
