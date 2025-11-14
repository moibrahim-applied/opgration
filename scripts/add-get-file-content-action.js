require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addGetFileContentAction() {
  try {
    console.log('🔍 Finding Google Drive integration...\n');

    // Get Google Drive integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id, name')
      .eq('slug', 'google-drive')
      .single();

    if (integrationError) {
      console.error('❌ Error finding Google Drive integration:', integrationError.message);
      return;
    }

    console.log(`✅ Found integration: ${integration.name} (ID: ${integration.id})\n`);

    // Check if action already exists
    const { data: existing } = await supabase
      .from('integration_actions')
      .select('id, name, slug')
      .eq('integration_id', integration.id)
      .eq('slug', 'get-file-content')
      .maybeSingle();

    if (existing) {
      console.log('⚠️  Get File Content action already exists!');
      console.log(`   ID: ${existing.id}`);
      console.log(`   Name: ${existing.name}`);
      return;
    }

    console.log('✅ Action does not exist. Proceeding with creation...\n');

    // Add Get File Content action
    const actionConfig = {
      integration_id: integration.id,
      name: 'Get File Content',
      slug: 'get-file-content',
      description: 'Export and retrieve textual content from Google Workspace files (Docs, Sheets, Slides)',
      http_method: 'GET',
      endpoint_path: '/drive/v3/files/{{fileId}}/export',
      request_schema: {
        type: 'object',
        properties: {
          fileId: {
            type: 'string',
            required: true,
            description: 'The ID of the Google Workspace file to export'
          },
          mimeType: {
            type: 'string',
            required: true,
            description: 'Export MIME type. For Docs: text/plain or text/html. For Sheets: text/csv. For Slides: text/plain'
          }
        }
      },
      response_schema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'Exported textual content from the file'
          }
        }
      },
      transform_config: {
        request: {
          params: {
            mimeType: '{{mimeType}}'
          }
        }
      }
    };

    const { data: newAction, error: actionError } = await supabase
      .from('integration_actions')
      .insert(actionConfig)
      .select()
      .single();

    if (actionError) {
      console.error('❌ Error adding action:', actionError.message);
      return;
    }

    console.log('✅ Successfully added Get File Content action!');
    console.log(`   ID: ${newAction.id}`);
    console.log(`   Name: ${newAction.name}`);
    console.log(`   Slug: ${newAction.slug}\n`);

    console.log('📝 Action Details:');
    console.log(`   Method: ${newAction.http_method}`);
    console.log(`   Endpoint: ${newAction.endpoint_path}`);
    console.log(`   Description: ${newAction.description}\n`);

    console.log('🎉 Integration complete!');
    console.log('\n⚠️  Usage Notes:');
    console.log('   - Works with Google Workspace files (Docs, Sheets, Slides)');
    console.log('   - Default export format: text/plain');
    console.log('   - Supported MIME types: text/plain, text/html, text/csv, application/pdf');
    console.log('   - For Google Docs: exports as plain text or HTML');
    console.log('   - For Google Sheets: exports as CSV or plain text');
    console.log('   - For Google Slides: exports as plain text');
    console.log('   - Does not work with binary files (use download-file action instead)');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

addGetFileContentAction();
