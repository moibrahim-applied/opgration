const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateScope() {
  try {
    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('id, auth_config')
      .eq('slug', 'google-drive')
      .single();

    if (fetchError) {
      console.error('Error fetching integration:', fetchError);
      return;
    }

    // Update the scope to allow full Drive access
    const updatedAuthConfig = {
      ...integration.auth_config,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ]
    };

    const { data, error } = await supabase
      .from('integrations')
      .update({ auth_config: updatedAuthConfig })
      .eq('slug', 'google-drive')
      .select();

    if (error) {
      console.error('Error updating scope:', error);
      return;
    }

    console.log('Successfully updated Google Drive OAuth scopes!');
    console.log('New scopes:', updatedAuthConfig.scopes);
    console.log('\nIMPORTANT: You need to re-authenticate (create a new connection) for these new scopes to take effect!');
  } catch (error) {
    console.error('Error:', error);
  }
}

updateScope();
