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

    // Update the search-files action to search both files and folders by name
    const { data, error } = await supabase
      .from('integration_actions')
      .update({
        description: 'Search for files and folders in Google Drive by name',
        transform_config: {
          request: {
            params: {
              q: "name contains '{{query}}' and trashed = false",
              pageSize: '{{pageSize}}',
              fields: 'files(id,name,mimeType,parents,webViewLink,createdTime),nextPageToken'
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

    console.log('Successfully updated search-files action to search files and folders by name');
    console.log(JSON.stringify(data[0].transform_config, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

updateSearchAction();
