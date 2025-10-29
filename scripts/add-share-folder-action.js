const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addShareFolderAction() {
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

    // Add Share Folder/File action
    const { data, error } = await supabase
      .from('integration_actions')
      .insert({
        integration_id: integration.id,
        name: 'Share File or Folder',
        slug: 'share',
        description: 'Share a file or folder with specific users or make it publicly accessible',
        http_method: 'POST',
        endpoint_path: '/drive/v3/files/{{fileId}}/permissions',
        request_schema: {
          type: 'object',
          properties: {
            fileId: {
              type: 'string',
              required: true,
              description: 'The ID of the file or folder to share'
            },
            type: {
              type: 'string',
              required: true,
              description: 'The type of grantee: user, group, domain, or anyone',
              default: 'user'
            },
            role: {
              type: 'string',
              required: true,
              description: 'The role: owner, organizer, fileOrganizer, writer, commenter, or reader',
              default: 'reader'
            },
            emailAddress: {
              type: 'string',
              description: 'Email address (required when type is user or group)'
            },
            sendNotificationEmail: {
              type: 'boolean',
              description: 'Whether to send a notification email',
              default: true
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The permission ID'
            },
            type: {
              type: 'string'
            },
            role: {
              type: 'string'
            },
            emailAddress: {
              type: 'string'
            }
          }
        },
        transform_config: {
          request: {
            body: {
              type: '{{type}}',
              role: '{{role}}',
              emailAddress: '{{emailAddress}}'
            },
            params: {
              sendNotificationEmail: '{{sendNotificationEmail}}'
            }
          }
        }
      })
      .select();

    if (error) {
      console.error('Error adding action:', error);
      return;
    }

    console.log('✅ Successfully added Share File or Folder action!');
    console.log(JSON.stringify(data[0], null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

addShareFolderAction();
