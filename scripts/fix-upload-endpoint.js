const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixEndpoints() {
  try {
    // Get Google Drive integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id')
      .eq('slug', 'google-drive')
      .single();

    if (integrationError) {
      console.error('Error:', integrationError);
      return;
    }

    console.log('Updating Google Drive integration baseUrl...');

    // Update integration baseUrl to root
    await supabase
      .from('integrations')
      .update({ base_url: 'https://www.googleapis.com' })
      .eq('id', integration.id);

    console.log('✅ Updated baseUrl to https://www.googleapis.com');

    // Update all action endpoints to include full path
    const updates = [
      {
        slug: 'create-folder',
        endpoint_path: '/drive/v3/files'
      },
      {
        slug: 'search-files',
        endpoint_path: '/drive/v3/files'
      },
      {
        slug: 'delete',
        endpoint_path: '/drive/v3/files/{{fileId}}'
      },
      {
        slug: 'upload-file',
        endpoint_path: '/upload/drive/v3/files?uploadType=multipart'
      }
    ];

    for (const update of updates) {
      const { error } = await supabase
        .from('integration_actions')
        .update({ endpoint_path: update.endpoint_path })
        .eq('integration_id', integration.id)
        .eq('slug', update.slug);

      if (error) {
        console.error(`Error updating ${update.slug}:`, error);
      } else {
        console.log(`✅ Updated ${update.slug}: ${update.endpoint_path}`);
      }
    }

    console.log('\n✅ All endpoints updated successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixEndpoints();
