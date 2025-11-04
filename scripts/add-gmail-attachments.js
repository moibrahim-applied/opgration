require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addGmailAttachments() {
  try {
    console.log('📎 Adding attachment support to Gmail send-email action...\n');

    // Get Gmail integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id')
      .eq('slug', 'gmail')
      .single();

    if (integrationError || !integration) {
      console.error('❌ Gmail integration not found');
      return;
    }

    // Update the send-email action schema
    const { data, error } = await supabase
      .from('integration_actions')
      .update({
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
            },
            attachments: {
              type: 'array',
              description: 'Array of attachments to include',
              items: {
                type: 'object',
                properties: {
                  filename: {
                    type: 'string',
                    required: true,
                    description: 'Name of the file (e.g., "invoice.pdf")'
                  },
                  content: {
                    type: 'string',
                    required: true,
                    description: 'Base64 encoded file content'
                  },
                  mimeType: {
                    type: 'string',
                    required: true,
                    description: 'MIME type (e.g., "application/pdf", "image/png")'
                  }
                }
              },
              default: []
            }
          }
        },
        description: 'Send an email via Gmail with support for HTML content, attachments, cc, and bcc'
      })
      .eq('integration_id', integration.id)
      .eq('slug', 'send-email')
      .select();

    if (error) {
      console.error('❌ Error updating action:', error.message);
      return;
    }

    console.log('✅ Gmail send-email action updated with attachment support!');
    console.log('\n📎 Attachment format:');
    console.log('   {');
    console.log('     "filename": "document.pdf",');
    console.log('     "content": "base64-encoded-content",');
    console.log('     "mimeType": "application/pdf"');
    console.log('   }');
    console.log('\n💡 Common MIME types:');
    console.log('   - PDF: application/pdf');
    console.log('   - Image (PNG): image/png');
    console.log('   - Image (JPG): image/jpeg');
    console.log('   - Word Doc: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    console.log('   - Excel: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    console.log('   - Text: text/plain');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

addGmailAttachments();
