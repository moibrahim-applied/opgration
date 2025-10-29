const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUploadAction() {
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

    const { data: action, error } = await supabase
      .from('integration_actions')
      .select('*')
      .eq('integration_id', integration.id)
      .eq('slug', 'upload-file')
      .single();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Upload File Action:');
    console.log('==================');
    console.log(JSON.stringify(action, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUploadAction();
