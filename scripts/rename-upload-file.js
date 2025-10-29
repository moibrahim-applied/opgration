const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function renameAction() {
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

    // Rename upload-file to create-file-from-text
    const { data, error } = await supabase
      .from('integration_actions')
      .update({
        name: 'Create File from Text',
        slug: 'create-file-from-text',
        description: 'Create a new text file in Google Drive with plain text content'
      })
      .eq('integration_id', integration.id)
      .eq('slug', 'upload-file')
      .select();

    if (error) {
      console.error('Error updating action:', error);
      return;
    }

    console.log('✅ Successfully renamed action!');
    console.log('Old: Upload File (upload-file)');
    console.log('New: Create File from Text (create-file-from-text)');
    console.log('');
    console.log(JSON.stringify(data[0], null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

renameAction();
