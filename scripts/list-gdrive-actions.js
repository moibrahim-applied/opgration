const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listActions() {
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

    const { data: actions, error } = await supabase
      .from('integration_actions')
      .select('id, name, slug, http_method, endpoint_path')
      .eq('integration_id', integration.id)
      .order('name');

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Current Google Drive Actions:');
    console.log('============================');
    actions.forEach(action => {
      console.log(`- ${action.name} (${action.slug})`);
      console.log(`  Method: ${action.http_method}`);
      console.log(`  Path: ${action.endpoint_path}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

listActions();
