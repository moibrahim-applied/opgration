const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkScopes() {
  try {
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('name, slug, auth_config')
      .eq('slug', 'google-drive')
      .single();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Google Drive Integration Config:');
    console.log(JSON.stringify(integration, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkScopes();
