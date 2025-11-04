require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addGmailIntegration() {
  try {
    console.log('🔍 Checking if Gmail integration already exists...\n');

    // Check if Gmail integration already exists
    const { data: existing, error: checkError } = await supabase
      .from('integrations')
      .select('id, name, slug')
      .eq('slug', 'gmail')
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking for existing integration:', checkError.message);
      return;
    }

    if (existing) {
      console.log('⚠️  Gmail integration already exists!');
      console.log(`   ID: ${existing.id}`);
      console.log(`   Name: ${existing.name}`);
      console.log(`   Slug: ${existing.slug}`);
      console.log('\n💡 If you want to add more actions, use a separate script.');
      return;
    }

    console.log('✅ Gmail integration does not exist. Proceeding...\n');

    // Insert Gmail integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .insert({
        name: 'Gmail',
        slug: 'gmail',
        description: 'Send and manage emails with Gmail',
        logo_url: 'https://n8n.io/nodes/gmail.svg',
        icon_svg: 'https://n8n.io/nodes/gmail.svg',
        base_url: 'https://gmail.googleapis.com/gmail/v1',
        auth_type: 'oauth2',
        auth_config: {
          authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
          token_url: 'https://oauth2.googleapis.com/token',
          scopes: [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.compose'
          ],
          client_id_env: 'GOOGLE_CLIENT_ID',
          client_secret_env: 'GOOGLE_CLIENT_SECRET'
        },
        is_active: true
      })
      .select()
      .single();

    if (integrationError) {
      console.error('❌ Error adding Gmail integration:', integrationError.message);
      return;
    }

    console.log('✅ Gmail integration added successfully!');
    console.log(`   ID: ${integration.id}`);
    console.log(`   Name: ${integration.name}\n`);

    // Add Send Email action
    const { data: sendEmailAction, error: sendEmailError } = await supabase
      .from('integration_actions')
      .insert({
        integration_id: integration.id,
        name: 'Send Email',
        slug: 'send-email',
        description: 'Send an email via Gmail with support for HTML content, attachments, cc, and bcc',
        http_method: 'POST',
        endpoint_path: '/api/gmail/send-email',
        request_schema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              required: true,
              description: 'Recipient email address (or comma-separated list)'
            },
            subject: {
              type: 'string',
              required: true,
              description: 'Email subject line'
            },
            body: {
              type: 'string',
              required: true,
              description: 'Email body content (plain text or HTML)'
            },
            isHtml: {
              type: 'boolean',
              default: false,
              description: 'Set to true if body contains HTML'
            },
            cc: {
              type: 'string',
              description: 'CC email addresses (comma-separated)'
            },
            bcc: {
              type: 'string',
              description: 'BCC email addresses (comma-separated)'
            },
            fromName: {
              type: 'string',
              description: 'Sender name (e.g., "John Doe")'
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Message ID'
            },
            threadId: {
              type: 'string',
              description: 'Thread ID'
            },
            labelIds: {
              type: 'array',
              description: 'Label IDs applied to the message'
            }
          }
        },
        transform_config: {}
      })
      .select();

    if (sendEmailError) {
      console.error('❌ Error adding Send Email action:', sendEmailError.message);
      return;
    }

    console.log('✅ Send Email action added successfully!\n');

    // Summary
    console.log('📧 Gmail Integration Setup Complete!');
    console.log('====================================');
    console.log(`Integration ID: ${integration.id}`);
    console.log(`Integration Slug: ${integration.slug}`);
    console.log('\nActions added:');
    console.log('  1. Send Email (send-email)');
    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('1. Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in your environment');
    console.log('2. Add these scopes to your Google Cloud Console OAuth consent screen:');
    console.log('   - https://www.googleapis.com/auth/gmail.send');
    console.log('   - https://www.googleapis.com/auth/gmail.readonly');
    console.log('   - https://www.googleapis.com/auth/gmail.compose');
    console.log('3. Update your OAuth redirect URI in Google Cloud Console:');
    console.log('   - Add: http://localhost:3000/api/auth/callback/gmail');
    console.log('   - (or your production domain)');
    console.log('4. The custom endpoint /api/gmail/send-email handles email formatting');
    console.log('   and includes security features like email validation and header injection prevention');
    console.log('\n✨ You can now connect Gmail and start sending emails!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

addGmailIntegration();
