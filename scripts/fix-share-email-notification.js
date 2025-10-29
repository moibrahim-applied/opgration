const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixShareEmailNotification() {
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

    // Update share action - remove sendNotificationEmail from schema
    // and always send it as true in params
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
              description: 'The role: reader, commenter, writer, fileOrganizer, organizer, or owner',
              default: 'reader'
            },
            emailAddress: {
              type: 'string',
              description: 'Email address (required when type is user or group)'
            },
            emailMessage: {
              type: 'string',
              description: 'A custom message to include in the notification email'
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
              sendNotificationEmail: 'true'
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

    console.log('✅ Successfully updated Share action - emails will always be sent!');
    console.log('Transform config:', JSON.stringify(data[0].transform_config, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

fixShareEmailNotification();
