const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateShareAction() {
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

    // Update share action to include email message
    const { data, error } = await supabase
      .from('integration_actions')
      .update({
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
            emailMessage: {
              type: 'string',
              description: 'A custom message to include in the notification email'
            },
            sendNotificationEmail: {
              type: 'boolean',
              description: 'Whether to send a notification email',
              default: true
            }
          }
        },
        transform_config: {
          request: {
            body: {
              type: '{{type}}',
              role: '{{role}}',
              emailAddress: '{{emailAddress}}',
              emailMessage: '{{emailMessage}}'
            },
            params: {
              sendNotificationEmail: '{{sendNotificationEmail}}'
            }
          }
        }
      })
      .eq('integration_id', integration.id)
      .eq('slug', 'share')
      .select();

    if (error) {
      console.error('Error updating action:', error);
      return;
    }

    console.log('✅ Successfully updated Share action with email message!');
    console.log(JSON.stringify(data[0], null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

updateShareAction();
