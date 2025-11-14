require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixEndpoint() {
  try {
    const { data: integration } = await supabase
      .from('integrations')
      .select('id, base_url')
      .eq('slug', 'google-drive')
      .single();

    console.log('Base URL:', integration.base_url);

    const { error } = await supabase
      .from('integration_actions')
      .update({
        endpoint_path: '/files/{{fileId}}/export'
      })
      .eq('integration_id', integration.id)
      .eq('slug', 'get-file-content');

    if (error) {
      console.error('Error:', error.message);
      return;
    }

    console.log('✅ Fixed endpoint path to: /files/{{fileId}}/export');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixEndpoint();
