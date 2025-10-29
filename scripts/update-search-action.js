const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSearchAction() {
  try {
    // First, get the Google Drive integration ID
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id')
      .eq('slug', 'google-drive')
      .single();

    if (integrationError || !integration) {
      console.error('Failed to find Google Drive integration:', integrationError);
      return;
    }

    console.log('Found Google Drive integration:', integration.id);

    // Update the search-files action
    const { data, error } = await supabase
      .from('integration_actions')
      .update({
        request_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              required: true,
              description: 'Search query to find files and folders'
            },
            pageSize: {
              type: 'number',
              default: 10,
              description: 'Maximum number of results to return'
            }
          }
        },
        transform_config: {
          request: {
            params: {
              q: "fullText contains '{{query}}' and trashed = false",
              pageSize: '{{pageSize}}',
              fields: 'files(id,name,mimeType,parents,webViewLink),nextPageToken'
            }
          }
        }
      })
      .eq('slug', 'search-files')
      .eq('integration_id', integration.id)
      .select();

    if (error) {
      console.error('Failed to update action:', error);
      return;
    }

    console.log('Successfully updated search-files action:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

updateSearchAction();
