const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addBinaryUploadAction() {
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

    // Add Upload Binary File action
    const { data, error } = await supabase
      .from('integration_actions')
      .insert({
        integration_id: integration.id,
        name: 'Upload Binary File',
        slug: 'upload-binary-file',
        description: 'Upload a binary file (image, PDF, etc.) to Google Drive using base64 encoded content',
        http_method: 'POST',
        endpoint_path: '/upload/drive/v3/files?uploadType=multipart',
        request_schema: {
          type: 'object',
          properties: {
            fileName: {
              type: 'string',
              required: true,
              description: 'The name of the file to create (e.g., image.png, document.pdf)'
            },
            fileContent: {
              type: 'string',
              required: true,
              description: 'Base64 encoded file content'
            },
            mimeType: {
              type: 'string',
              required: true,
              description: 'The MIME type of the file (e.g., image/png, application/pdf)'
            },
            parentFolderId: {
              type: 'string',
              description: 'Optional: The ID of the parent folder'
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            id: {
              type: 'string'
            },
            name: {
              type: 'string'
            },
            mimeType: {
              type: 'string'
            },
            webViewLink: {
              type: 'string'
            }
          }
        },
        transform_config: {}
      })
      .select();

    if (error) {
      console.error('Error adding action:', error);
      return;
    }

    console.log('✅ Successfully added Upload Binary File action!');
    console.log(JSON.stringify(data[0], null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

addBinaryUploadAction();
