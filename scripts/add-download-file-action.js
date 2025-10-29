const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDownloadFileAction() {
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

    // Check if action already exists
    const { data: existing } = await supabase
      .from('integration_actions')
      .select('id, name')
      .eq('integration_id', integration.id)
      .eq('slug', 'download-file');

    if (existing && existing.length > 0) {
      console.log('⚠️  Download File action already exists:', existing[0].name);
      return;
    }

    // Add Download File action
    const { data, error } = await supabase
      .from('integration_actions')
      .insert({
        integration_id: integration.id,
        name: 'Download File',
        slug: 'download-file',
        description: 'Download a file from Google Drive by its file ID',
        http_method: 'GET',
        endpoint_path: '/drive/v3/files/{{fileId}}',
        request_schema: {
          type: 'object',
          properties: {
            fileId: {
              type: 'string',
              required: true,
              description: 'The ID of the file to download'
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'File content (base64 encoded for binary files)'
            },
            mimeType: {
              type: 'string',
              description: 'MIME type of the file'
            },
            fileName: {
              type: 'string',
              description: 'Name of the file'
            }
          }
        },
        transform_config: {
          request: {
            params: {
              alt: 'media'
            }
          },
          response: {
            type: 'binary',
            encoding: 'base64'
          }
        }
      })
      .select();

    if (error) {
      console.error('Error adding action:', error);
      return;
    }

    console.log('✅ Successfully added Download File action!');
    console.log(JSON.stringify(data[0], null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

addDownloadFileAction();
