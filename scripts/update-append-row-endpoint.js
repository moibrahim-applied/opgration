const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAppendRowEndpoint() {
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

    // Update the Append Row action to use custom endpoint
    const { data, error } = await supabase
      .from('integration_actions')
      .update({
        endpoint_path: 'https://azariah-cherubic-acronically.ngrok-free.dev/api/sheets/append',
        http_method: 'POST',
        transform_config: {
          request: {
            body: {
              spreadsheetId: '{{spreadsheetId}}',
              range: '{{range}}',
              values: '{{values}}'
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

    console.log('✅ Successfully updated Append Row action to use custom endpoint!');
    console.log('');
    console.log('New configuration:');
    console.log('- Endpoint:', data[0].endpoint_path);
    console.log('- HTTP Method:', data[0].http_method);
    console.log('- Transform Config:', JSON.stringify(data[0].transform_config, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

updateAppendRowEndpoint();
