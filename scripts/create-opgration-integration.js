const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createOpgrationIntegration() {
  try {
    // Create Opgration integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .insert({
        name: 'Opgration Utilities',
        slug: 'opgration',
        description: 'Built-in utility functions for file conversions and data transformations',
        logo_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=opgration',
        icon_svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
        base_url: 'http://localhost:3000',
        auth_type: 'oauth2',
        auth_config: {},
        is_active: true
      })
      .select()
      .single();

    if (integrationError) {
      console.error('Error creating integration:', integrationError);
      return;
    }

    console.log('✅ Created Opgration integration:', integration.id);

    // Create PDF to Base64 action
    const { data: action1, error: action1Error } = await supabase
      .from('integration_actions')
      .insert({
        integration_id: integration.id,
        name: 'PDF to Base64',
        slug: 'pdf-to-base64',
        description: 'Convert a PDF file from URL to base64 encoded string',
        http_method: 'POST',
        endpoint_path: '/api/utils/pdf-to-base64',
        request_schema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              required: true,
              description: 'URL of the PDF file to convert'
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            base64: {
              type: 'string',
              description: 'Base64 encoded PDF content'
            },
            size: {
              type: 'number',
              description: 'Original file size in bytes'
            },
            fileName: {
              type: 'string',
              description: 'Original file name'
            }
          }
        },
        transform_config: {}
      })
      .select()
      .single();

    if (action1Error) {
      console.error('Error creating PDF to Base64 action:', action1Error);
      return;
    }

    console.log('✅ Created PDF to Base64 action');

    // Create Image to Base64 action
    const { data: action2, error: action2Error } = await supabase
      .from('integration_actions')
      .insert({
        integration_id: integration.id,
        name: 'Image to Base64',
        slug: 'image-to-base64',
        description: 'Convert an image file from URL to base64 encoded string',
        http_method: 'POST',
        endpoint_path: '/api/utils/image-to-base64',
        request_schema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              required: true,
              description: 'URL of the image file to convert'
            }
          }
        },
        response_schema: {
          type: 'object',
          properties: {
            base64: {
              type: 'string',
              description: 'Base64 encoded image content'
            },
            mimeType: {
              type: 'string',
              description: 'MIME type of the image'
            },
            size: {
              type: 'number',
              description: 'Original file size in bytes'
            }
          }
        },
        transform_config: {}
      })
      .select()
      .single();

    if (action2Error) {
      console.error('Error creating Image to Base64 action:', action2Error);
      return;
    }

    console.log('✅ Created Image to Base64 action');
    console.log('');
    console.log('All Opgration utility actions created successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

createOpgrationIntegration();
