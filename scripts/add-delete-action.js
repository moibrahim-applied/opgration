const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDeleteAction() {
  try {
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id')
      .eq('slug', 'google-drive')
      .single();

    if (integrationError) {
      console.error('Error:', integrationError);
      return;
    }

    console.log('Found Google Drive integration:', integration.id);

    // Add Delete File/Folder action
    const { data, error } = await supabase
      .from('integration_actions')
      .insert({
        integration_id: integration.id,
        name: 'Delete File or Folder',
        slug: 'delete',
        description: 'Permanently delete a file or folder from Google Drive',
        http_method: 'DELETE',
        endpoint_path: '/files/{{fileId}}',
        request_schema: {
          type: 'object',
          properties: {
            fileId: {
              type: 'string',
              required: true,
              description: 'The ID of the file or folder to delete'
            }
          }
        },
        response_schema: {},
        transform_config: {
          request: {
            params: {},
            headers: {},
            body: {}
          }
        }
      })
      .select();

    if (error) {
      console.error('Error adding action:', error);
      return;
    }

    console.log('✅ Successfully added Delete File/Folder action!');
    console.log(JSON.stringify(data[0], null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

addDeleteAction();
