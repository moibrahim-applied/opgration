const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addListFolderContentsAction() {
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

    // Add List Files in Folder action
    const { data, error } = await supabase
      .from('integration_actions')
      .insert({
        integration_id: integration.id,
        name: 'List Files in Folder',
        slug: 'list-folder-contents',
        description: 'List all files and folders inside a specific folder',
        http_method: 'GET',
        endpoint_path: '/drive/v3/files',
        request_schema: {
          type: 'object',
          properties: {
            folderId: {
              type: 'string',
              required: true,
              description: 'The ID of the folder to list contents from'
            },
            pageSize: {
              type: 'number',
              default: 100,
              description: 'Maximum number of files to return (max 1000)'
            },
            orderBy: {
              type: 'string',
              default: 'folder,name',
              description: 'Sort order: folder,name | modifiedTime desc | createdTime | name'
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            files: {
              type: 'array',
              description: 'Array of files and folders'
            },
            nextPageToken: {
              type: 'string',
              description: 'Token for next page of results'
            }
          }
        },
        transform_config: {
          request: {
            params: {
              q: "'{{folderId}}' in parents and trashed = false",
              pageSize: '{{pageSize}}',
              orderBy: '{{orderBy}}',
              fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,parents),nextPageToken'
            }
          }
        }
      })
      .select();

    if (error) {
      console.error('Error adding action:', error);
      return;
    }

    console.log('✅ Successfully added List Files in Folder action!');
    console.log(JSON.stringify(data[0], null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

addListFolderContentsAction();
