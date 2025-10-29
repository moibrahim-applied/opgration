const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addListAllFolderContentAction() {
  try {
    // Find Google Drive integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id, name')
      .eq('slug', 'google-drive')
      .single();

    if (integrationError || !integration) {
      console.error('Google Drive integration not found:', integrationError);
      return;
    }

    console.log('Found Google Drive integration:', integration.name, integration.id);

    // Add List All Folder Content (Recursive) action
    const { data: action, error: actionError } = await supabase
      .from('integration_actions')
      .insert({
        integration_id: integration.id,
        name: 'List All Folder Content',
        slug: 'list-all-folder-content',
        description: 'Recursively list all files and folders within a parent folder (including all subfolders)',
        http_method: 'POST',
        endpoint_path: 'http://localhost:3000/api/drive/list-recursive',
        request_schema: {
          type: 'object',
          properties: {
            folderId: {
              type: 'string',
              required: true,
              description: 'The ID of the parent folder to list contents from (recursively)'
            },
            maxDepth: {
              type: 'number',
              required: false,
              description: 'Maximum folder depth to traverse (default: 10, max: 20)',
              default: 10
            },
            includeFiles: {
              type: 'boolean',
              required: false,
              description: 'Whether to include files in the results (default: true)',
              default: true
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the operation was successful'
            },
            folder: {
              type: 'object',
              description: 'Recursive folder tree structure with all files and subfolders'
            },
            summary: {
              type: 'object',
              properties: {
                totalFiles: {
                  type: 'number',
                  description: 'Total number of files found'
                },
                totalFolders: {
                  type: 'number',
                  description: 'Total number of folders found'
                },
                maxDepthReached: {
                  type: 'number',
                  description: 'Maximum depth that was set'
                }
              }
            }
          }
        },
        transform_config: {}
      })
      .select()
      .single();

    if (actionError) {
      console.error('Error adding action:', actionError);
      return;
    }

    console.log('✅ Successfully added "List All Folder Content" action!');
    console.log('');
    console.log('Example usage via v2 API:');
    console.log(JSON.stringify({
      api_key: 'your-api-key',
      workspace_id: 'workspace-uuid',
      project_id: 'project-uuid',
      connection_id: 'google-drive-connection-uuid',
      action: 'list-all-folder-content',
      parameters: {
        folderId: '1PPgNgr2BBIbTneYVivr7lCt3zOw47_O8',
        maxDepth: 10,
        includeFiles: true
      }
    }, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

addListAllFolderContentAction();
