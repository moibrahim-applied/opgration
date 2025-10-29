const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addGetFileDetailsAction() {
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

    // Add Get File Details action
    const { data, error } = await supabase
      .from('integration_actions')
      .insert({
        integration_id: integration.id,
        name: 'Get File or Folder Details',
        slug: 'get-details',
        description: 'Get detailed information about a file or folder including metadata, links, and permissions',
        http_method: 'GET',
        endpoint_path: '/drive/v3/files/{{fileId}}',
        request_schema: {
          type: 'object',
          properties: {
            fileId: {
              type: 'string',
              required: true,
              description: 'The ID of the file or folder'
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'File ID'
            },
            name: {
              type: 'string',
              description: 'File name'
            },
            mimeType: {
              type: 'string',
              description: 'MIME type'
            },
            size: {
              type: 'string',
              description: 'File size in bytes'
            },
            createdTime: {
              type: 'string',
              description: 'Creation timestamp'
            },
            modifiedTime: {
              type: 'string',
              description: 'Last modification timestamp'
            },
            webViewLink: {
              type: 'string',
              description: 'Link to view in browser'
            },
            webContentLink: {
              type: 'string',
              description: 'Link to download file'
            },
            parents: {
              type: 'array',
              description: 'Parent folder IDs'
            }
          }
        },
        transform_config: {
          request: {
            params: {
              fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents,owners,permissions,shared'
            }
          }
        }
      })
      .select();

    if (error) {
      console.error('Error adding action:', error);
      return;
    }

    console.log('✅ Successfully added Get File or Folder Details action!');
    console.log(JSON.stringify(data[0], null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

addGetFileDetailsAction();
