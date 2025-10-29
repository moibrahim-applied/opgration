const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listSheetsActions() {
  try {
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id')
      .eq('slug', 'google-sheets')
      .single();

    if (integrationError) {
      console.error('Integration not found:', integrationError);
      return;
    }

    const { data: actions, error } = await supabase
      .from('integration_actions')
      .select('slug, name, endpoint_path, http_method, request_schema, transform_config')
      .eq('integration_id', integration.id)
      .order('created_at');

    if (error) {
      console.error('Error fetching actions:', error);
      return;
    }

    console.log('Google Sheets Actions:');
    console.log('='.repeat(80));
    actions.forEach((action, index) => {
      console.log(`\n${index + 1}. ${action.name} (${action.slug})`);
      console.log(`   Method: ${action.http_method}`);
      console.log(`   Endpoint: ${action.endpoint_path}`);
      console.log(`   Schema: ${action.request_schema ? Object.keys(action.request_schema.properties || {}).join(', ') : 'None'}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

listSheetsActions();
